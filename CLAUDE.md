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
entsteht die neue Aufteilung. **Phase 1 + 2 sind fertig** (Struktur, Vokabular,
portierte Regel-Engine); Phase 3–6 stehen aus, siehe unten.

## Architektur (Ziel)

```
backend/     FastAPI + PostgreSQL (SQLAlchemy async/asyncpg), verwaltet mit uv
             app/conjugation/  die Regel-Engine (aus TypeScript portiert)
             app/vocabulary.py Laden + Validieren der Wortlisten
frontend/    Angular 20 (standalone, signals, Router), Dockerfile → nginx
data/        Vokabular als JSON (jisho.json, aus dem Crawler)
jisho-crawler/  Holt Verben/Adjektive von jisho.org nach data/vocabulary/
src/         ALT: die Angular-13-App, wird in Phase 4 ersetzt
docs/        ALT: Build-Output für GitHub Pages, entfällt mit dem Deployment
```

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
cd backend && uv run pytest        # 288 Tests, keine externen Abhängigkeiten
```

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

## Phasen

| # | Inhalt | Status |
|---|---|---|
| 1 | Repo-Struktur, `jisho.ts` → `data/vocabulary/jisho.json`, Crawler umgestellt | fertig |
| 2 | Engine-Port + Specs nach pytest + Vollständigkeitslauf | fertig |
| 3 | Backend: Modelle, Seeding, Drei-Elo-Auswahl, `/api/*`, testcontainers | offen |
| 4 | Frontend Angular 20, Practice-Route mit Feature-Parität, `src/` entfällt | offen |
| 5 | Docker/Compose/nginx/GHCR/Unraid (Frontend :8084), E2E im Container | offen |
| 6 | Stats (Heatmap Form × Wortart), Vokabel-Browser, Settings, Mobile-Runde | offen |

## Konventionen & Fallstricke

- Python ≥3.12 laut `pyproject.toml` (`match` braucht 3.10, `StrEnum` 3.11);
  das lokale System-Python ist 3.9, deshalb **immer über `uv run`** arbeiten.
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
