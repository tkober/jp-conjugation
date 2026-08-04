# JP Conjugation Practice

Web-App zum Üben japanischer Konjugationen: Es wird ein Wort (Verb oder
Adjektiv) mit einer Zielform angezeigt, der (einzige, globale) User tippt die
konjugierte Form in Kana. Die App wertet Stamm und Endung getrennt aus, trackt
den Stand pro Regel *und* pro Vokabel und wählt die nächste Aufgabe adaptiv.

Vorlage für Architektur und Betrieb ist `tkober/katakana-reading` — die
übertragbaren Muster stehen dort in CLAUDE.md unter „Übertragbare Muster".

## Stand: Umbau läuft (Branch `modernization`)

`main` trägt die alte Version: Angular 13, alles im Browser, Fortschritt im
`localStorage`, Deployment als GitHub Pages aus `docs/`. Auf `modernization`
entsteht die neue Aufteilung. **Phase 1–5 sind fertig** — die App läuft im
Compose-Stack und ist benutzbar. Offen ist Phase 6 (Stats-Ansicht,
Vokabelbrowser, Settings-UI).

**`src/` und `docs/` stehen noch da.** Der Plan sah vor, sie mit Phase 4 zu
löschen; das wäre verfrüht gewesen, weil die Settings-UI (Formen- und
JLPT-Auswahl) noch nicht portiert ist. Sie fliegen mit Phase 6, wenn die
Parität wirklich erreicht ist. Aktiv ist von beidem nichts.

## Architektur (Ziel)

```
backend/     FastAPI + PostgreSQL (SQLAlchemy async/asyncpg), verwaltet mit uv
             + Dockerfile (uv-Image python3.14, uvicorn) + tests/
frontend/    Angular 20 (standalone, signals, Router)
             + Dockerfile (Node 22 Build → nginx) + nginx.conf + proxy.conf.json
data/        Vokabular als JSON (jisho.json, aus dem Crawler)
jisho-crawler/  Holt Verben/Adjektive von jisho.org nach data/vocabulary/
dbeaver/     Einmaliges DB-Bootstrap (Rollen, Datenbank, Default-Privileges)
dev/initdb/  Dieselben Rollen für den lokalen Postgres-Container
compose.yaml Lokaler Stack: Postgres + Backend + Frontend auf :8084
src/, docs/  ALT: Angular-13-App und ihr Pages-Build, entfallen mit Phase 6
```

Der Compose-Stack ist eine **Kette von Healthchecks**: Backend startet erst,
wenn Postgres `pg_isready` meldet, Frontend erst, wenn das Backend
`/api/health` beantwortet (dafür gibt es die Route). `dev/initdb` legt dieselben
zwei Rollen an wie die Produktion — der Owner/App-Split wird also lokal
wirklich durchlaufen und nicht nur behauptet.

**Zwei Container plus Datenbank.** nginx liefert die SPA aus und proxyt `/api/`
intern ans Backend (`API_UPSTREAM`, Default `jp-conjugation-backend:8000`) —
dadurch ruft das Frontend die API immer *same-origin* auf, egal über welche
Adresse man die App erreicht, und CORS spielt keine Rolle. Der Backend-Port
muss nicht veröffentlicht werden.

**Lokal Port 8084, nicht 8080**, weil dort schon der katakana-reading-Stack
läuft; 8084 ist auch der vorgesehene Unraid-Port.

### Backend-Module (`backend/app/`)

- `conjugation/` — die Regel-Engine, aus TypeScript portiert. Siehe unten.
- `vocabulary.py` — Laden, Validieren und Deduplizieren der Wortlisten.
- `practice.py` — was ein Übungsitem ist (Form × Wortart × Trigger) und wie
  schwer es startet, plus `conjugate()` als einziger Einstieg in die Engine.
- `answer.py` — Normalisierung und Stamm/Endung-Split der Antwort.
- `game.py` — Elo, Auswahl, `submit_answer`. Bekommt die `AsyncSession`
  durchgereicht, wie in der Vorlage.
- `db.py` — ORM-Modelle, Engines (lazy, `reset_engines()` für Tests und
  Shutdown), `init_db()` mit `create_all` + `migrate_schema()` + Seeding.
  **`create_all` legt nur fehlende Tabellen an, keine Spalten** — neue Spalten
  brauchen eine Zeile in `migrate_schema()` (`ADD COLUMN IF NOT EXISTS`,
  idempotent, läuft bei jedem Boot).
- `config.py` — Env-Konfiguration. Die URLs sind **Funktionen**, keine
  Modulkonstanten: die Tests biegen die DB um, nachdem längst importiert wurde.
- `api.py`, `main.py` — Routen und App-Setup. Keine Statics, die SPA liefert
  nginx.

### Frontend (`frontend/src/app/`)

- `app.component.ts` — Shell: Header mit Level/Elo/Streak-Chips (geteiltes
  Signal in `api.service.ts`, beim Start über `/api/profile` befüllt),
  Fortschrittsbalken zum nächsten Level, Theme-Umschalter
  (system/hell/dunkel, in `localStorage`).
- `practice.component.ts` — Übungsansicht mit explizitem Session-Lebenszyklus
  (`idle` → `active` → `answered` → `ended`). Die Session startet **nicht**
  automatisch. Countdown-Ring (SVG, `stroke-dashoffset`, r=19 in einer 44er-Box;
  Restsekunden in der Mitte, letztes Viertel und Überzeit rot, bei Überzeit
  zählt er als „+x,x s" hoch), Auflösung mit Herleitungskette,
  Session-Zusammenfassung.
- `furigana.ts` — Zerlegung fürs `<ruby>`: welcher Teil eine Lesung darüber
  bekommt und was Okurigana ist. Portiert aus den drei Pipes der alten App.
- `api.service.ts`, `models.ts`, `routes.ts` — HTTP, Typen, Routen.
- Light + Dark über CSS Custom Properties in `styles.css`.

**Komponenten laufen auf `OnPush`.** Aller Zustand liegt in Signals, damit
Change Detection an Signal-Writes hängt und nicht an zone.js — sonst schlagen
genau die Writes nicht durch, die außerhalb eines gepatchten Callbacks
passieren (siehe wanakana unten).

Das Deployment wird wie bei katakana-reading: zwei GHCR-Images (Backend, nginx
mit der SPA), nginx proxyt `/api` same-origin ans Backend, zwei Postgres-Rollen
(`conjugation_owner` nur für DDL + Seeding beim Start, `conjugation_app` für
Requests), Stack auf Unraid am externen `postgres-core-net`.

## Die Regel-Engine (`backend/app/conjugation/`)

Der Kern des Projekts und der Grund für den Port: die Fachlogik gehört ins
Backend, nicht ins Frontend. Die Struktur der TypeScript-Vorlage ist bewusst
erhalten — ein Modul pro Form, gleiche Reihenfolge der Fälle, japanische
Kommentare wörtlich übernommen.

- `core.py` — `WordType`, `Transformation`, `Word`, die `Conjugation`-Basis.
  `Word` ist **mutierbar und fluent** (`replace_last_kana` gibt `self`
  zurück). Das ist keine Nachlässigkeit, sondern trägt die zusammengesetzten
  Formen: Vergangenheit baut auf der Te-Form auf, Kausativ-Passiv auf dem
  Kausativ, und weil dieselbe Instanz weitergereicht wird, entsteht **eine**
  durchgehende Herleitungskette in `transformations` statt mehrerer Fragmente.
  Wer hier auf unveränderliche Objekte umstellt, muss die Kette explizit
  weiterreichen.
- `Word.__eq__` vergleicht **nur** kanji/hiragana/word_type — nicht die
  Transformationen. Genau das ist der Punkt, an dem die alten Jasmine-Specs
  gescheitert sind (siehe unten).
- `hiragana.py` — Kana-Tabelle. `Hiragana.consonant` ist der Reihen-Schlüssel
  ('k', 's', …), `Hiragana.group` die zugehörige あ/い/う/え/お-Reihe. Der
  Kanji-Godan-Umlaut lebt davon: `last_kana.group.a + 'ない'`.
  **Lücke wie im Original:** für 'y', 'w', 'nn' und 'j' gibt es keine
  `HiraganaGroup`. Verben enden nie auf diesen Kana, deshalb fällt es nicht
  auf — ein Zugriff würde einen `KeyError` werfen.
- `forms/` — 20 Formklassen, jede mit `title`, `settings_title` und
  `conjugate(word) -> Word | None`.
- `registry.py` — die Formgruppen, wie der Settings-Dialog sie zeigt, plus
  `compose_adjective_srs_key` / `compose_verbs_srs_key`. Die Dict-Keys
  (`Verbs__TeFormAffirmative`) sind die stabilen Form-Keys für Settings und
  SRS. Dieselbe Klasse bedient Adjektive und Verben, deshalb der Präfix.
  **Reihenfolge unverändert übernommen**, inklusive der Eigenheit, dass in
  `VERBS__NON_PAST_FORMS` die höfliche Verneinung *vor* der höflichen Bejahung
  steht (im Adjektiv-Pendant ist es andersherum).

### Was der Port an der Vorlage geändert hat

| TypeScript | Python | warum |
|---|---|---|
| `switch (word.wordType)` | `match word.word_type:` | liest sich 1:1 |
| `getTitle()` / `getSettingsTitle()` | Klassenattribute | in TS Methoden wegen des Interfaces, in Python konstante Strings |
| `getLastKana()` | `last_kana` (property) | |
| `HIRAGANA[k].getGroup()` | `HIRAGANA[k].group` | das String-Feld heißt jetzt `consonant`, was es auch ist |
| `undefined` | `None` | `?.` wird zu explizitem `if … is None: return None` |
| die 28 exportierten Form-Key-Konstanten | entfallen | waren toter Code — die Objektliterale nutzten die Bezeichner als Schlüsselnamen, nie die Konstanten |

## Tests (`backend/tests/`)

```bash
cd backend && uv run pytest        # 354 Tests
```

Die Konjugationstests (290) brauchen nichts weiter. Die übrigen starten sich
per testcontainers selbst ein `postgres:17-alpine` → **Docker muss laufen**.
`TEST_DB_URL=…` zeigt stattdessen auf eine vorhandene Datenbank. Owner und App
sind in den Tests derselbe Superuser: der Rechte-Split ist ein
Deployment-Thema und wird vom Compose-Stack abgedeckt.

- `conjugation/cases.py` — die Wörter, gegen die jede Form geprüft wird: eine
  pro Godan-Endung, beide unregelmäßigen Verben, beide Adjektivtypen und die
  zwei Wörter mit eigener Regel (良い, 呉れる). Die Fall-Labels sind die aus den
  alten Specs und tauchen als pytest-IDs wieder auf.
- `conjugation/test_<form>.py` — 20 Module, je eine `parametrize`-Tabelle.
  Die 285 Erwartungswerte wurden **maschinell aus den `.spec.ts`-Dateien
  extrahiert**, nicht abgetippt.
- `conjugation/test_vocabulary.py` — der Gegenpart: jede Vokabel in jeder
  anwendbaren Form. Ein `None` hieße, die App hätte eine Aufgabe ohne Lösung.
  Aktuell 64.916 Konjugationen, keine Lücke.
- `test_answer.py` — Normalisierung und Stamm/Endung-Split, ohne DB.
- `test_game.py` — die Rating-Mathematik, ohne DB.
- `test_db.py` — Seeding, Idempotenz, Rating-Verschiebung bei geändertem
  base_rating, Pruning mit Historienschutz, Reset.
- `test_selection.py` — Auswahl und Antwort Ende-zu-Ende gegen die DB.
- `test_api.py` — die Routen über den `TestClient`, der die Lifespan mitfährt
  (also auch Schema und Seeding).

### Warum die alte Suite grün aussah, aber nichts prüfte

Die 20 Jasmine-Specs waren **rot bzw. wirkungslos**, was vor dem Port
niemandem aufgefallen ist, weil `ng test` seit Angular 13 nicht mehr lief:

- 285 Assertions der Form
  `expect(result).toEqual(new Word('食べて', 'たべて', WordType.IchidanVerb))`
  konnten nicht durchgehen: `Word` ist mutierbar, `getConjugation()` verändert
  das Objekt und zeichnet dabei `_transformations` auf — das frisch
  konstruierte Vergleichsobjekt hat die nicht, und Jasmines `toEqual`
  vergleicht strukturell. Gegen jasmine-core 4.0.0 nachgestellt: `false`.
- `non-past-short-affirmative.spec.ts` (`toEqual(word)`) und
  `imperative-negative.spec.ts` (`toEqual(word.addSuffix('な'))`) verglichen das
  Ergebnis **gegen sich selbst** — immer grün, prüfte nichts. Diese beiden
  Tabellen sind die einzigen von Hand geschriebenen.

Die *Erwartungswerte* waren die ganze Zeit korrekt, nur der Vergleich nicht.
`Word.__eq__` über die drei Felder — was `Word.equals()` in der TS-Fassung
schon konnte, in den Specs aber nie benutzt wurde — macht sie scharf.

## Vokabular (`data/vocabulary/`)

`jisho.json`, 3.739 Einträge, aus `jisho.ts` extrahiert. Format:

```json
{"godan_verb": [{"kanji": "会う", "hiragana": "あう", "english": "…", "jlpt": "n5"}, …]}
```

Verteilung: suru 1.563, godan 886, na-Adj 562, ichidan 467, i-Adj 260, kuru 1.
Nach JLPT: n1 1.685, n2 822, n3 760, n4 266, n5 206 — **N1 stellt 45 %**.
Die alte App zog gleichverteilt, damit war fast jede Übung N1-Vokabular; die
neue Auswahl gewichtet nach Wort-Elo.

`load_vocabulary()` liest alle `*.json` im Verzeichnis (`VOCABULARY_DIR`,
Default `<repo>/data/vocabulary`) in Pfad-Reihenfolge und prüft die Pflichtkeys.

Geprüfte Datenannahmen (alle erfüllt): suru-Verben enden auf する in Kanji
*und* Kana, kuru ist ausschließlich 来る/くる, Ichidan endet auf る, Godan auf
der う-Reihe, i-Adjektive auf い.

**Offen: 96 Einträge tragen Katakana in der Lesung** (バテる, サボる,
コピーする, テストする …). Die Konjugation stimmt — das letzte Kana ist
Hiragana —, aber die alte App konnte sie nie richtig bewerten: der Input ist
per wanakana auf Hiragana gebunden, verglichen wurde gegen `solution.hiragana`
mit Katakana darin. Für die neue Auswertung muss beim Vergleich normalisiert
werden (Katakana → Hiragana auf beiden Seiten), sonst sind diese Wörter
unlösbar.

## Das SRS

**Kein Intervall-SRS, bewusst.** Konjugationsregeln sind prozedurales Wissen —
man vergisst ぐ → いで nicht wie eine Vokabel, man wird langsam und unsicher.
Bei ~250 Items gäbe es auch kein sinnvolles „für heute fertig". Stattdessen
(Phase 3):

- **Drei Elo-Ratings**: User, Regel-Item und Wort. Eine Aufgabe ist ein Paar
  (Regel, Wort), die Schwierigkeit addiert sich. Damit lässt sich der Anspruch
  konstant halten und trotzdem variieren, *welche Achse* ihn trägt — schwere
  Regel mit leichtem Wort oder umgekehrt.
- **SRS-Item = Form × Wortart × Trigger**, Trigger ist bei Godan das letzte
  Kana. Aus 96 groben Items werden ~250 feine, und Te-Form-ぐ ist von
  Te-Form-む unterscheidbar. Das ist Muster 3 der Vorlage
  („Auswertung auf Komponenten-Ebene"), auf Konjugationen übertragen.
- **Zeit-Malus im Auswahlgewicht** statt Fälligkeitsdatum: was lange nicht dran
  war, steigt im Gewicht. Die Vorlage benennt genau das als ihre eigene Lücke.
- **Anti-Monotonie**: keine Wiederholung der letzten N Items, Cooldown auf der
  Formgruppe, Probe-Anteil oberhalb und Review-Anteil unterhalb.
- **Stamm und Endung getrennt bewerten** (gemeinsames Präfix von Erwartung und
  Eingabe). „Falsche Vokalreihe im Stamm" ist ein anderer Fehler als „falsche
  Endung".

Das ersetzt die alte Heuristik in `src/app/services/srs.service.ts`, deren
Vorzeichen nicht zur Sortierrichtung passten: `streakWeight = -5` bei
aufsteigender Sortierung hat bevorzugt die Items vorgelegt, die man am besten
konnte, und `failRatioWeight = +3` die mit hoher Fehlerquote nach hinten
geschoben. Der alte Fortschritt wird deshalb **nicht migriert** — er ist von
dieser Verzerrung geprägt und besteht ohnehin nur aus 96 Aggregaten ohne
Zeitstempel.

### Was eine Simulation über 400 Aufgaben gezeigt hat

Nachgestellt mit einem Lerner, der die Grundformen kann, bei Passiv/Kausativ
schwächelt und speziell bei Godan ぐ/ぬ/ぶ patzt:

- Die Gewichtung trifft: Passiv/Kausativ kamen 32×, Non-past-Affirmativ 7×;
  bei den Godan-Triggern standen ぐ und ぬ oben.
- Die Streuung stimmt: 216 von 256 Items in 400 Runden, keins öfter als 6×.
- Elo lief von 1000 auf ~1300 und pendelte dort.
- **Trefferquote ~52 %.** Das ist kein Fehler, sondern der Elo-Fixpunkt: wer
  auf dem eigenen Niveau spielt, gewinnt die Hälfte.

Der naheliegende Fix — die Aufgaben bewusst leichter servieren — funktioniert
**nicht** und wurde nach dem Messen wieder ausgebaut: die Erwartung im
Elo-Update wird aus dem *tatsächlich servierten* Paar berechnet, ein konstanter
Offset macht das Rating also nur zu „das Niveau, auf dem ich 70 % treffe", und
zieht die Item-Auswahl mit nach unten (in der Simulation kippte die Übung
prompt zu den bereits beherrschten Formen). Wenn eine mildere Gangart gewünscht
ist, gehört sie in die Score-Stufen oder als expliziten Regler in die
Einstellungen — nicht in die Zielrating-Formel.

Die Item-Ratings bewegen sich in 400 Runden übrigens kaum (K=12 bei ~1,5
Beobachtungen je Item). Sie kalibrieren sich über Wochen, nicht über eine
Sitzung — die Startwerte in `practice.py` tragen anfangs also mehr Gewicht,
als „Elo kalibriert sich selbst" vermuten lässt.

## Phasen

| # | Inhalt | Status |
|---|---|---|
| 1 | Repo-Struktur, `jisho.ts` → `data/vocabulary/jisho.json`, Crawler umgestellt | fertig |
| 2 | Engine-Port + Specs nach pytest + Vollständigkeitslauf | fertig |
| 3 | Backend: Modelle, Seeding, Drei-Elo-Auswahl, `/api/*`, testcontainers | fertig |
| 4 | Frontend Angular 20, Practice-Route | fertig |
| 5 | Docker/Compose/nginx/GHCR (Frontend :8084), E2E im Container | fertig |
| 6 | Stats (Heatmap Form × Wortart), Vokabel-Browser, Settings-UI, `src/`+`docs/` löschen | offen |

Der Unraid-Stack selbst liegt in `tkober/compose-stacks-unraid` und ist noch
nicht angelegt — Images und Bootstrap-SQL stehen dafür bereit.

## Entwicklung

```bash
docker compose up -d postgres                      # kommt in Phase 5
cd backend && cp .env.example .env                 # DB_*-Variablen füllen
cd backend && uv run uvicorn app.main:app --reload # API auf :8000
cd backend && uv run pytest                        # Tests (Docker muss laufen)
```

## Konventionen & Fallstricke

- Python ≥3.12 laut `pyproject.toml` (`match` braucht 3.10, `StrEnum` 3.11);
  das lokale System-Python ist 3.9, deshalb **immer über `uv run`** arbeiten.
- **`app.db.Word` ≠ `app.conjugation.Word`.** Das eine ist die Tabellenzeile,
  das andere das Objekt, das die Engine mutiert. Beim Importieren beider in
  eine Datei aliasen.
- Die Lösung darf `/api/exercise/next` nicht verlassen — sie kommt erst mit
  `/api/answer` zurück. `test_api.py` prüft das.
- Postgres ≠ SQLite: `LIKE` ist case-sensitiv (die Wortsuche nutzt `ilike`),
  `correct` ist ein `boolean` (Aggregate über `count().filter(...)`, nicht
  `SUM`), und `created_at` kommt als ISO-8601 mit Offset zurück.
- **`(ngSubmit)` ohne `FormsModule` bindet nichts.** `ngSubmit` ist ein Output
  von `NgForm`; fehlt das Modul, hängt Angular stattdessen einen Listener auf
  ein DOM-Event namens „ngSubmit", das nie feuert — und der Browser schickt das
  Formular **nativ** ab, die Seite lädt neu. Deshalb steht hier `(submit)` mit
  eigenem `preventDefault()`. Symptom war ein „Check"-Klick, der die Übung
  kommentarlos auf den Startbildschirm zurücksetzte.
- **wanakana schreibt das Eingabefeld aus seinem eigenen Listener um**, und
  nicht immer im selben Task. Wer den Wert synchron im `(input)`-Handler liest,
  sieht das Romaji, das gleich ersetzt wird. Die Übung liest deshalb verzögert
  (`setTimeout`) und hört zusätzlich auf `keyup`. Das ist auch der Grund für
  `OnPush`: der verzögerte Write liegt außerhalb der zone.js-Patches.
- `frontend/nginx.conf` ist ein **envsubst-Template**: `PORT` und
  `API_UPSTREAM` brauchen `ENV`-Defaults im Dockerfile (envsubst ersetzt nur
  *gesetzte* Variablen — eine ungesetzte bliebe wörtlich stehen und nginx
  startet nicht), und envsubst schreibt auch **Kommentare** um, weshalb die
  Datei die Variablennamen im Fließtext meidet.
- Der Angular-Dev-Server lädt bei jedem Rebuild neu und setzt damit den
  Session-Zustand zurück. **UI im Container prüfen**, nicht auf `:4200`:
  `docker compose up --build -d`, dann per Chrome-DevTools-MCP mit
  `emulate viewport 360x880x3,mobile` durchgehen und pro Route
  `document.documentElement.scrollWidth == clientWidth` gegenprüfen.
- `WordType` ist `StrEnum` mit den **unveränderten** Werten aus der TS-Fassung
  (`godan_verb`, …), damit DB, API und Frontend dieselben Strings sprechen.
- Formklassen sind zustandslos und liegen als Singletons in `registry.py` —
  `conjugate()` mutiert das übergebene `Word`, nie die Form.
- Beim Testen einer Form nie dasselbe `Word` zweimal konjugieren: die erste
  Konjugation hat es bereits verändert.
- Kein Test-Runner fürs Frontend (wie in der Vorlage) — bei einer
  Single-User-App mehr Gerüst als Nutzen. Die Fachlogik liegt ohnehin im
  Backend, und genau die ist getestet.
- Referenzbreite ist ein 360px-Handy. Jede Flex-Zeile mit einem `<input>`
  braucht am Input `min-width: 0`; Gegenprobe pro Route:
  `document.documentElement.scrollWidth == clientWidth`.
