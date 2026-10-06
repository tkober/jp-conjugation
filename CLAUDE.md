# JP Conjugation Practice

Web-App zum Üben japanischer Konjugationen: Es wird ein Wort (Verb oder
Adjektiv) mit einer Zielform angezeigt, der (einzige, globale) User tippt die
konjugierte Form in Kana. Die App wertet Stamm und Endung getrennt aus, trackt
den Stand pro Regel *und* pro Vokabel und wählt die nächste Aufgabe adaptiv.

Vorlage für Architektur und Betrieb ist `tkober/katakana-reading` — die
übertragbaren Muster stehen dort in CLAUDE.md unter „Übertragbare Muster".

## Stand

Der Umbau auf Angular 20 + FastAPI/Postgres ist **komplett** und auf `main`
gemerged — die alte Angular-13-Version (`src/`, `docs/`, GitHub-Pages-Deploy)
ist entfernt. Feature-Arbeit läuft seither auf Branch + PR gegen `main`.

Offen ist nur noch das, was außerhalb dieses Repos liegt: der Unraid-Stack in
`tkober/compose-stacks-unraid`. Images und Bootstrap-SQL sind dafür fertig.

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
- `rules.py` (#11, „Rules Section") — der Nachschlageteil: pro Settings-Gruppe
  ein handgeschriebener Absatz (`GROUP_TEXTS`: wofür die Form steht, wie sie
  gebaut wird), pro Form eine Regeltabelle. **Die Tabellen sind nicht
  handgeschrieben**: jede Zeile konjugiert ein Beispielwort (`SAMPLES`, dieselben
  Wörter wie `tests/conjugation/cases.py`) mit der Engine und liest die Regel
  am Ergebnis ab (`rule_of()`: Stamm nach Wortart abschneiden, `う → わない`;
  bleibt die Endung stehen, wird ein Suffix daraus, `+ な`; unverändert ist
  `('', '')`). So kann die Referenz nie von dem abweichen, was die Übung als
  richtig wertet. Die Sonderfälle der Engine (行く, 呉れる, 良い) bekommen nur
  dort eine eigene Zeile, wo die reguläre Regel sie falsch vorhersagen würde.
  Ausgeliefert über `/api/rules`, statisch, ohne DB.
- `game.py` — Elo, Auswahl, `submit_answer`. Bekommt die `AsyncSession`
  durchgereicht, wie in der Vorlage.
- `db.py` — ORM-Modelle, Engines (lazy, `reset_engines()` für Tests und
  Shutdown), `init_db()` mit `create_all` + `migrate_schema()` +
  `migrate_data()` + Seeding.
  **`create_all` legt nur fehlende Tabellen an, keine Spalten** — neue Spalten
  brauchen eine Zeile in `migrate_schema()` (`ADD COLUMN IF NOT EXISTS`,
  idempotent, läuft bei jedem Boot). `migrate_data()` ist das Pendant für
  Datenkorrekturen statt Spalten — aktuell die einmalige Umbenennung der
  Jisho-Homograph-Zeilen (#5, siehe „Vokabular" unten), idempotent und bei
  jedem Boot direkt nach `migrate_schema()`.
- `config.py` — Env-Konfiguration. Die URLs sind **Funktionen**, keine
  Modulkonstanten: die Tests biegen die DB um, nachdem längst importiert wurde.
- `api.py`, `main.py` — Routen und App-Setup. Keine Statics, die SPA liefert
  nginx.

### Frontend (`frontend/src/app/`)

Ordnerkonvention (#16): `core/` sind Singletons und Typen, die die ganze App
teilt (`api.service.ts`, `models.ts`), `shared/` sind wiederverwendete Bausteine
ohne Feature-Zugehörigkeit (`furigana.ts`, `word-types.ts`,
`form-instruction/`), `layout/` (#17) ist die App-Chrome außerhalb der Features
(`header/`), `features/` hat einen Ordner pro Route
(`practice/`, `rules/`, `stats/`, `words/`, `settings/`). Jede Komponente hat
Template und Styles in eigenen Dateien (`templateUrl`/`styleUrl`, nicht
inline) statt Template-Literalen im `.ts`. `app.config.ts` trägt die
`ApplicationConfig` (HttpClient, Router), `main.ts` ruft nur noch
`bootstrapApplication(AppComponent, appConfig)`. Die Routen stehen in
`app.routes.ts` (vormals `routes.ts`).

- `app.component.ts` (#17) — nur noch Layout-Rahmen (`:host`-Maße/Padding) und
  Profil-Load beim Start (`api.loadProfile()`); Template ist `<app-header />`
  plus `<main><router-outlet /></main>`. Das Favicon ist dasselbe Zeichen als
  Inline-SVG-Data-URI in `index.html` — kein Asset, nichts synchron zu halten.
- `layout/header/header.component.ts` (#17) — Marke (活 im Akzent-Quadrat plus
  Wortmarke, wie bei katakana-reading; die Wortmarke wird unter 430px
  ausgeblendet, sonst schiebt sie die Chips aus dem Viewport),
  Level/Elo/Streak-Chips (geteiltes Signal in `core/api.service.ts`),
  Fortschrittsbalken zum nächsten Level, Tabs und Theme-Button (liest
  `core/theme.service.ts`). **Sticky sitzt auf `:host`, nicht auf `<header>`**:
  ein sticky Element klebt nur innerhalb seines *Parents*, und `<header>`
  wäre jetzt ein Kind von `app-header`, dessen Host-Element genau so hoch ist
  wie der Header selbst — also müssen `position: sticky` & Co. auf den Host.
- `core/theme.service.ts` (#17) — Theme-Zustand (system/hell/dunkel) als
  Singleton: `theme`/`icon`/`title` als Signals, `cycle()`, Persistenz in
  `localStorage` hinter try/catch (private Modus kann den Zugriff werfen).
- `features/practice/practice.component.ts` (#19) — Übungsansicht mit explizitem
  Session-Lebenszyklus (`idle` → `active` → `answered` → `ended`). Die Session
  startet **nicht** automatisch. Hält Session-Zustand, Timer und
  wanakana-Bindung; das Eingabefeld, Fokus-Handling (siehe unten) und der
  Check/Next-Button bleiben hier, weil sie die ganze Session über existieren
  müssen. Die drei präsentationalen Kind-Komponenten bekommen nur Signal-
  `input()`s/`output()`s, keinen eigenen Zustand:
  - `countdown-ring/countdown-ring.component.ts` — der Ring selbst (SVG,
    `stroke-dashoffset`, r=19 in einer 44er-Box; Restsekunden in der Mitte,
    letztes Viertel und Überzeit rot, bei Überzeit zählt er als „+x,x s" hoch).
    Inputs `elapsedMs`/`targetMs`, Host `display: contents`, weil der Ring als
    Flex-Item in der `.task`-Zeile des Eltern-Templates sitzt und keine eigene
    Box dafür aufmachen darf.
  - `verdict/verdict.component.ts` — die Auflösung: Headline, Grammatik-Zeile,
    Lösung mit Furigana, Elo-Delta, Jisho-Link, Herleitungskette. Inputs
    `result`/`exercise`. Der Jisho-Link nimmt per lokalem
    `(mousedown)="keepFocus($event)"` dem Eingabefeld weiterhin nicht den
    Fokus — dasselbe Muster wie beim Check/Next-Button im Elternteil, nur hier
    dupliziert, weil der Handler jetzt am Link selbst hängt.
  - `session-summary/session-summary.component.ts` — die
    Session-Zusammenfassung. Inputs `answered`/`correct`/`totalTimeMs`/
    `eloDelta`, Output `restart` statt direktem `(click)="start()"`.

  Alle drei Hosts stehen auf `display: block` (verdict, session-summary) bzw.
  `display: contents` (countdown-ring) — ein Angular-Custom-Element ist sonst
  `display: inline` und würde den Flow/Flex-Kontext der Eltern-Styles
  verändern. Emulated Encapsulation heißt auch: jede CSS-Regel ist mit ihrem
  Markup gewandert, inklusive der `@media (max-height: 500px)`-Anteile (siehe
  unten) und der zwei `.up`/`.down`-Zeilen, die in verdict und session-summary
  bewusst dupliziert sind statt über eine globale Klasse geteilt — für zwei
  Einzeiler lohnt sich keine gemeinsame Datei.

  **Der Fokus bleibt die ganze Session im Eingabefeld** — auf dem Handy hängt
  daran die Bildschirmtastatur (siehe unten). Die Zielform zeigt
  `shared/form-instruction/form-instruction.component.ts` statt eines Titels
  (siehe unten, „Anweisungen als Chips"). Die Auflösung nennt seit #6 auch die
  abgefragte Grammatik (`.grammar`, z. B. „Godan verb (ぐ) · Te-form,
  positive") — bei beiden Ausgängen, richtig wie falsch, direkt unter der
  正解/不正解-Headline. Die Wortart-Titel kommen aus `shared/word-types.ts`
  (`wordTypeTitle()`), geteilt mit `features/stats/stats.component.ts`. Seit #7 verlinkt die
  Auflösung zusätzlich, in einer Zeile mit dem Elo-Delta, auf den
  jisho.org-Eintrag des Worts (Kanji + Leerzeichen + Lesung im Suchpfad — das
  setzt bei Jisho auch bei Homographen und suru-Verben den exakten Eintrag an
  erste Stelle). Der Link öffnet in einem neuen Tab und nimmt per
  `(mousedown)="keepFocus($event)"` dem Eingabefeld nicht den Fokus, genau wie
  Check/Next.
- `shared/form-instruction/form-instruction.component.ts` — rendert `Exercise.instruction` (eine
  geordnete Liste strukturierter Teile, siehe
  `backend/app/conjugation/instruction.py`) als Chip-Reihe, in einem von drei
  Stilen (`text` / `emoji` / `both`, Signal-Input `mode`). **Nicht `style`
  nennen** — das kollidiert mit der eingebauten DOM-Eigenschaft, die Angular
  auf jedem Host-Element schon bindet, ein gleichnamiger Component-Input bekäme
  nie einen Wert.
- `features/stats/stats.component.ts` (#20) — lädt die Stats, Empty-/Loading-Zustand,
  Layout; behält die kleinen Karten (Weakest rules, Misses-Split, Recent) selbst.
  Drei Kind-Komponenten bekommen nur `input()`s, keinen Server-Zugriff:
  - `kpi-tiles/kpi-tiles.component.ts` — die vier Kacheln oben (Answered,
    Accuracy, Ø time, Best streak).
  - `elo-sparkline/elo-sparkline.component.ts` — die Elo-Karte: Verlauf als
    SVG-Polyline (eine Serie, deshalb ohne Legende) plus Min/Max-Skala.
  - `miss-rate-heatmap/miss-rate-heatmap.component.ts` — als Kernstück die
    **Heatmap Form × Wortart**, getrennt für Adjektive und Verben, plus Chips
    für die neun Godan-Endungen. Hält das `selected`-Signal selbst, weil Chips
    und Readout es teilen und deshalb zusammengehören. Kodiert wird die
    **Fehlerquote**, nicht die Trefferquote: so sticht hervor, was Arbeit
    braucht, statt zu verblassen. „Noch nie geübt" ist ein eigener Zustand
    (gestrichelte Zelle) und nicht der hellste Rampenschritt — 0 % richtig und
    „nie probiert" dürfen nicht gleich aussehen.

  `stats-math.ts` trägt den testbaren Kern als freie Funktionen statt
  Komponenten-Methoden: `bucket()`, `toCell()`, `rowsFor()`, `triggerCells()`
  (Godan-Gruppierung + ja-Sortierung) und `sparkline()` (Punktgeometrie), dazu
  die `Cell`/`HeatRow`-Typen und `VERB_TYPES`/`ADJECTIVE_TYPES`/`HEAT_BOUNDS`/
  `HEAT_LABELS`. `stats-math.spec.ts` deckt Bucket-Grenzen, Godan-Sortierung
  und die Sparkline-Randfälle (< 2 Punkte, flacher Verlauf) ab, ohne TestBed.
- `features/rules/rules.component.ts` (#11, Tabelle ausgelagert #21) — Tab
  „Rules": Gruppen-Chips (Adjectives / Verbs), darunter Erklärung und ein
  Segment-Umschalter für die Formen der Gruppe. Die gewählte Form steht in der
  URL (`/rules/:form`, Links mit `replaceUrl`), ohne Parameter Te-Form positiv.
  Picker und Erklärkarte bleiben hier; die Tabelle selbst ist
  `rule-table/rule-table.component.ts` — Inputs `formTitle`/`sections`
  (Gruppierung nach Wortart, `Section`-Typ lebt dort), dazu `patternKind()`
  (unchanged/append/drop/replace) und `tilde()` samt ihren Doc-Kommentaren.
  Muster und Beispiel teilen sich eine Zeile, solange beide passen; die
  Herleitungskette (gleiches Styling wie in der Auflösung) erscheint nur bei
  zusammengesetzten Formen — bei einem Schritt sagt sie nichts, was das Muster
  nicht schon sagt. Mit fünf Tabs werden die Tabs unter 430px enger und
  kleiner, damit sie bei 360px in eine Zeile passen. `rules.component.css`
  behält `.card { padding: 16px }` für Picker/Erklärkarte, `rule-table`
  wiederholt dieselbe Regel für die eigene `.card.table` (Emulated
  Encapsulation reicht keine Eltern-Overrides in ein Kind durch).
- `features/words/words.component.ts` — Vokabelbrowser mit Filtern (Wortart, JLPT, Suche mit
  Entprellung), Sortierung und Blättern zu 50. Bewusst **nicht** aufgeteilt
  (#21): mit 105/95/134 Zeilen klein genug und in sich geschlossen, anders als
  Settings und Rules.
- `features/settings/settings.component.ts` (#21, vorher ein Monolith) — lädt
  `Settings` einmal und `apply()`t jede Antwort; das Template reiht fünf
  Karten-Components, jede mit eigenem `.card`-Template inkl. h2/Hint:
  `forms-card/`, `instructions-card/`, `vocabulary-card/`, `time-budget-card/`,
  `reset-card/`. Jede Karte (außer `reset-card`) bekommt `settings: Settings`
  als Input und hat einen `save = output<SettingsUpdate>()`; der Elternteil
  ruft `api.saveSettings()` **genau einmal pro Nutzeraktion**, wie vorher, und
  `apply()`t die Antwort. **Optimistisches UI über `linkedSignal`**: Karten
  halten ihren lokalen Entwurf (`disabledForms`, `instructionOrder`,
  `baseMs`, …) als `linkedSignal(() => this.settings().…)` — der Klick setzt
  den Entwurf sofort (ohne auf die Antwort zu warten), und sobald der
  Elternteil neue `settings` durchreicht, resettet der `linkedSignal`
  automatisch auf den Serverstand. Die Guards sind unverändert: `toggleForm`/
  `toggleLevel` brechen vor dem Senden ab, wenn danach keine Form/kein Level
  mehr übrig bliebe. `instructions-card` hält `TENSE_FIRST_ORDER` als
  TS-Konstante (die alte „Tense first"-Preset) neben `styleLabel`/
  `dimensionLabel`/`moveInstruction`/`applyOrder`/`isActiveOrder`.
  `time-budget-card` vergleicht seinen Entwurf direkt gegen `settings()` statt
  gegen ein gemerktes Feld — die „Saved"-Flash braucht trotzdem eine explizite
  Bestätigung, *welche* Karte gerade gespeichert hat (ein globaler Zähler
  würde bei jedem Save in irgendeiner Karte aufblitzen): der Elternteil bumpt
  ein `budgetSaveTick`-Signal nur nach der Antwort auf *diese* Karte, die Karte
  beobachtet es per `effect()` und zeigt „Saved" für 1500 ms. `reset-card` ist
  bewusst eigenständig — ein Reset betrifft keine `Settings`, also ruft die
  Karte `api.reset()` + `api.loadProfile()` selbst, statt ein Output
  durchzureichen, das der Elternteil nur weitergeben würde. Gemeinsame Regeln
  (`h3`, `.hint`-Margin, `.options`, `.toggle`+`.on`+Input, `.actions`,
  `button`/`button.ghost`/`button.destructive`, `.warn`) stehen in
  `settings-shared.css`, das jede Karte per zweitem `styleUrls`-Eintrag
  einbindet — nur echte Abweichungen bleiben in der Karten-CSS.
  **Die Zeitbudget-Beispiele kommen aus `/api/settings`**, damit die Formel
  nicht doppelt gepflegt wird. Die Karte „Instructions": Chip-Stil
  (Text/Emoji/Text + emoji, sofort gespeichert), die Reihenfolge der vier
  Dimensionen als Liste mit ▲/▼ (Swap in einer Kopie, sofort gespeichert),
  zwei Presets („Japanese build order" = `defaults.instruction_order`, „Tense
  first" s.o. — der jeweils aktive ist deaktiviert), eine Live-Vorschau aus
  `instruction_examples` und, außer im Text-Stil, eine Legende aus
  `instruction_dimensions`. Auch hier kommt die Vorschau vom Server, aus
  demselben Grund wie beim Zeitbudget.
- `shared/furigana.ts` — Zerlegung fürs `<ruby>`: welcher Teil eine Lesung darüber
  bekommt und was Okurigana ist. Portiert aus den drei Pipes der alten App.
- `core/api.service.ts`, `core/models.ts`, `app.routes.ts` — HTTP, Typen, Routen.
- Light + Dark über CSS Custom Properties in `styles/tokens.css` (#18).

**Globale Styles (#18)** liegen in drei Dateien statt einer, in dieser
Reihenfolge in `angular.json` nach dem Font-CSS: `styles/tokens.css` (Custom
Properties), `styles/base.css` (Element-Grundstile: `*`, `html`/`body`,
`button`, `input`, `:focus-visible`), `styles/components.css` (global geteilte
Bausteine). Jedes Token steht **genau einmal**, mit `light-dark(hell, dunkel)`
statt getrennten Blöcken für `:root`, `@media (prefers-color-scheme: dark)`
und `[data-theme]`: `:root` setzt `color-scheme: light dark` (die Systemwahl
entscheidet), `[data-theme='light'|'dark']` kippt nur noch `color-scheme` auf
die explizite Wahl — kein Token wird dort neu definiert. Braucht Chrome 123 /
Safari 17.5 / Firefox 120+. Geteilte Bausteine wie `.card`, `.hint`,
`button.primary` (inkl. `:disabled`) und die `h2`-Grundgröße leben als globale
Klassen in `styles/components.css`; die Feature-Komponenten (`features/*/*.component.css`)
behalten nur noch die echten Abweichungen (z. B. `.card { padding: 16px; }`
in rules/words statt 20px, die abweichenden `.hint`-margins, die zusätzlichen
`button.primary`-Eigenschaften in practice).

**Die Heatmap-Rampe** ist eine sequenzielle Ein-Hue-Skala (blau) aus der
validierten Referenzpalette des `dataviz`-Skills, Schritte 250→650. Sie steht in
`styles/tokens.css` neben dem restlichen Theme und ist **im Dark Mode umgedreht**,
damit „mehr" immer vom Hintergrund wegläuft. Beide Richtungen sind gegen die
tatsächlichen Flächen dieser App validiert (`#ffffff` bzw. `#1c1f25`), nicht
gegen die Default-Flächen des Skills — der hellste Schritt der Originalrampe
fiel gegen Weiß mit 1,32:1 durch. Wer die Farben anfasst: den Validator erneut
laufen lassen, nicht schätzen. Und die Bildunterschrift sagt bewusst
„stronger", nicht „darker" — „dunkler" wäre im Dark Mode schlicht falsch.

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
- `forms/` — 20 Formklassen, jede mit `title`, `settings_title`,
  `conjugate(word) -> Word | None` und (seit #3) vier Klassenattributen
  `category`/`tense`/`politeness`/`polarity` — siehe `instruction.py`.
- `registry.py` — die Formgruppen, wie der Settings-Dialog sie zeigt, plus
  `compose_adjective_srs_key` / `compose_verbs_srs_key`. Die Dict-Keys
  (`Verbs__TeFormAffirmative`) sind die stabilen Form-Keys für Settings und
  SRS. Dieselbe Klasse bedient Adjektive und Verben, deshalb der Präfix.
  Reihenfolge wie im Original — mit einer Ausnahme: in `VERBS__NON_PAST_FORMS`
  stand die höfliche Verneinung vor der höflichen Bejahung, anders als in
  jeder anderen Gruppe. Das war in der alten App unsichtbar, in der neuen
  Settings-Liste liest es sich als Fehler, deshalb ist es begradigt. Die Keys
  bleiben unverändert.
- `instruction.py` (#3, „Verwirrende Anweisungen") — zerlegt eine Zielform in
  bis zu vier **Dimensionen** (`category`, `tense`, `politeness`, `polarity`)
  statt einer Titel-Prosa wie „Non-past, short, negative": der eine
  Unterschied, der zählt, sitzt dann in seiner eigenen Chip statt hinter einem
  gemeinsamen „-ativ"-Suffix, Tempus/Höflichkeit/Polarität können ein Emoji
  tragen (die Kategorie bewusst nicht — die eigentliche Grammatik als
  Piktogramm verwirrt mehr, als sie hilft; sie bleibt in jedem Stil Text), und die
  Reihenfolge ist eine Nutzereinstellung statt in Prosa eingefroren. Die 8
  einfachen Formen setzen `tense`/`politeness`/`polarity`, die 12 abgeleiteten
  (Te-Form, Potential, Passiv, Kausativ, Kausativ-Passiv, Imperativ) setzen
  `category` statt `tense`/`politeness` — die beiden variieren innerhalb einer
  Kategorie ohnehin nie, eine Chip dafür würde nur immer dasselbe wiederholen.
  `instruction_parts(form, order)` baut die Chips in der gegebenen
  Dimensionsreihenfolge, `is_valid_order()` prüft eine vom User gewählte
  Reihenfolge (genau die vier Dimensionen, je einmal), `dimension_catalog()`
  liefert die Legende für die Settings-Seite. `core.py` importiert die Enums
  von hier, nicht umgekehrt — `instruction.py` weiß nichts von `Conjugation`.

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
cd backend && uv run pytest        # 645 Tests
```

Die Konjugationstests, `test_instruction.py` und `test_rules.py` (s.u.)
brauchen nichts weiter. Die übrigen starten sich
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
- `test_instruction.py` — Dimensionen ohne DB: jede Form setzt `polarity` und
  entweder `category` oder `tense`+`politeness` (nie beides), die
  Dimensions-Fingerabdrücke sind pro Wortklasse eindeutig, jeder benutzte Wert
  hat einen `VALUES`-Eintrag, `instruction_parts()` liefert die Chips in der
  gewünschten Reihenfolge, `is_valid_order()` prüft die Presets und lehnt
  kaputte Reihenfolgen ab.
- `test_rules.py` — die Regeltabellen ohne DB: jede Gruppe hat Text, jede
  Zeile reproduziert ihr Beispiel aus Endung + Ersatz, jede Godan-Endung hat ein
  Beispiel, Ausnahmen erscheinen genau dort, wo sie die Regel brechen.
- `test_answer.py` — Normalisierung und Stamm/Endung-Split, ohne DB.
- `test_game.py` — die Rating-Mathematik, ohne DB.
- `test_db.py` — Seeding, Idempotenz, Rating-Verschiebung bei geändertem
  base_rating, Pruning mit Historienschutz, Reset, die Jisho-Homograph-
  Umbenennung aus `migrate_data()` (#5).
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

**Jishos Homograph-Suffix (#5, „Falsches Word").** Jisho unterscheidet
Homographe, indem es an den Slug „-1", „-2", … hängt (上手-1/うわて neben
上手/じょうず). `jisho-crawler/main.py` speicherte den Slug früher
unverändert als `kanji` — die Praxis zeigte dann z. B. „下手-2じゃない" statt
„下手じゃない". `optimize_word()` schneidet das Suffix jetzt ab
(`re.sub(r'-\d+$', ...)`, `add_suffix()` hängt する an den bereinigten Slug),
`data/vocabulary/jisho.json` ist neu geschrieben (40 betroffene Einträge), ein
Test in `test_vocabulary.py` bewacht, dass kein geladener Eintrag wieder
Ziffern trägt, und `db.migrate_data()` benennt bereits gesäte, ggf. beantwortete
Zeilen in Produktion in-place um, statt sie über Seeding+Pruning zu ersetzen.

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
| 6 | Stats (Heatmap Form × Wortart), Vokabel-Browser, Settings-UI, alte App entfernt | fertig |

Der Unraid-Stack selbst liegt in `tkober/compose-stacks-unraid` und ist noch
nicht angelegt — Images und Bootstrap-SQL stehen dafür bereit.

### Ideen / offen

- Wort-Elo-Verlauf, Level-History
- Export/Import des Fortschritts
- Trefferquote-Regler (siehe die Simulation oben: der Elo-Fixpunkt liegt bei
  ~50 %; wer es milder will, muss an die Score-Stufen, nicht an die Zielformel)
- Alternative gültige Formen akzeptieren (ら抜き: 食べれる neben 食べられる)

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
- Frontend-Tests (#15): `cd frontend && npm test` (= `ng test --watch=false`),
  Vitest + jsdom über `@angular/build:unit-test` (`experimental`, kein Karma).
  Specs liegen neben der Quelle (`*.spec.ts`), `tsconfig.spec.json` nimmt sie
  auf, `tsconfig.app.json` schließt sie von `ng build` aus. `frontend-ci.yml`
  baut und testet jeden PR, der `frontend/**` ändert.
- **Japanisch braucht eine explizite Schrift im Font-Stack** (#13). Ohne sie
  greift Chrome unter Windows auf Yu Gothic zurück (bei `lang="en"` auch auf
  eine chinesische Schrift), und die wirkt bei normaler Strichstärke dünn und
  drahtig. `styles/base.css` nennt deshalb nach den Latin-Systemschriften Hiragino
  (macOS/iOS bleiben unverändert) und dann `Noto Sans JP Variable`. Die kommt
  aus `@fontsource-variable/noto-sans-jp`, ist in `angular.json` unter
  `styles` eingebunden und wird mit der App ausgeliefert, ohne Google Fonts.
  Die 124 Teil-Fonts haben `unicode-range`s, ein Browser lädt also nur, was
  die Seite braucht.
- **Ein Component-Input darf nicht `style` heißen.** Angular bindet auf jedem
  Host-Element schon die eingebaute DOM-Eigenschaft `style`; ein gleichnamiger
  `input()` bekommt dadurch nie einen Wert, ohne dass es einen Fehler gibt.
  `shared/form-instruction/form-instruction.component.ts` nennt seinen Stil-Input deshalb `mode`.
- Die Routen in `app.routes.ts` sind seit #17 alle `loadComponent` (Lazy
  Loading) statt `component` — jedes Feature wird ein eigener Chunk, der
  Initial-Bundle sinkt entsprechend.
- Der Zeitbudget-Default stieg mit #3 von 3000+700/Kana auf 4500+1000/Kana
  (~50 %) — nicht wegen der Formel, sondern weil die alte Vorgabe knapp genug
  war, dass Lesen der (jetzt klareren) Anweisungs-Chips plus Tippen auf einer
  Handytastatur die Uhr oft vor der Antwort ablaufen ließ. Bereits gespeicherte
  Werte werden **nicht** migriert — `migrate_schema()` setzt nur den
  Spalten-`DEFAULT` für künftige Zeilen; „Auf Standard zurücksetzen" in den
  Einstellungen liefert die neuen Werte.
- Referenzbreite ist ein 360px-Handy. Jede Flex-Zeile mit einem `<input>`
  braucht am Input `min-width: 0`; Gegenprobe pro Route:
  `document.documentElement.scrollWidth == clientWidth`.
- **Die Bildschirmtastatur ist ein zweiter Viewport.** `index.html` setzt
  `interactive-widget=resizes-content`: die Tastatur verkleinert damit den
  *Layout*-Viewport statt nur den visuellen. Mit dem Standard
  (`resizes-visual`) behält die Seite ihre volle Höhe hinter der Tastatur, der
  Browser scrollt das fokussierte Feld sichtbar — und der sticky Header
  verschwindet über dem sichtbaren Streifen. Zweite Referenzgröße ist deshalb
  **360×380**: das bleibt von einem 787px-Handy übrig, wenn die Tastatur steht.
  Die `@media (max-height: 500px)`-Blöcke in `app.component.css` und, seit #19
  auf vier Dateien verteilt (`practice.component.css` plus je ihr Anteil in
  `countdown-ring/`, `verdict/`, `session-summary/`), stutzen die Übung genau
  darauf, damit beim Tippen ins Feld gar nichts mehr zu scrollen ist.
- **Die Tastatur geht nur für einen Fokus auf, den der Nutzer ausgelöst hat** —
  einmal offen, darf sie zwischen zwei Übungen also nie verloren gehen. Drei
  Dinge nähmen sie einem: `readonly` (Android schließt die Tastatur für ein
  read-only-Feld — statt `[readOnly]` stellt `scheduleSync()` den bewerteten
  Wert wieder her), der Fokus, den ein Button beim Tippen an sich zieht
  (`(mousedown)` mit `preventDefault()`, der Klick kommt trotzdem), und ein
  `focus()`, das erst nach der Antwort des Servers kommt — „Next" fokussiert
  deshalb **synchron in der Geste**, bevor die nächste Übung überhaupt
  angefragt ist. Das `focus()` nach dem Rendern (`afterNextRender`, sonst gibt
  es das Feld noch gar nicht) bleibt als Netz für den Sessionstart.
- Mit stehender Tastatur passen Aufgabe, Eingabe *und* Auflösung nicht
  gleichzeitig auf den Schirm. Nach dem Prüfen rückt deshalb die Eingabezeile
  unter den Header (`scrollIntoView` + `scroll-margin-top` in Höhe des
  Headers), damit Korrektur und „Next" sich den sichtbaren Streifen teilen; die
  nächste Übung scrollt wieder nach oben. Auf einem Schirm, auf dem alles
  passt, tun beide Aufrufe nichts.
