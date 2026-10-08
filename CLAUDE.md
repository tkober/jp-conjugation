# JP Conjugation Practice

Web-App zum Üben japanischer Konjugationen: Es wird ein Wort (Verb oder
Adjektiv) mit einer Zielform angezeigt, der (einzige, globale) User tippt die
konjugierte Form in Kana. Die App wertet Stamm und Endung getrennt aus, trackt
den Stand pro Regel *und* pro Vokabel und wählt die nächste Aufgabe adaptiv.

Vorlage für Architektur und Betrieb ist `tkober/katakana-reading` — die
übertragbaren Muster stehen dort in CLAUDE.md unter „Übertragbare Muster".

## Stand

Der Umbau auf Angular + FastAPI/Postgres ist **komplett** und auf `main`
gemerged — die alte Angular-13-Version (`src/`, `docs/`, GitHub-Pages-Deploy)
ist entfernt. Feature-Arbeit läuft seither auf Branch + PR gegen `main`. Das
Frontend ist seit #29 auf Angular 22 und zoneless.

Offen ist nur noch das, was außerhalb dieses Repos liegt: der Unraid-Stack in
`tkober/compose-stacks-unraid`. Images und Bootstrap-SQL sind dafür fertig.

## Architektur (Ziel)

```
backend/     FastAPI + PostgreSQL (SQLAlchemy async/asyncpg), verwaltet mit uv
             + Dockerfile (uv-Image python3.14, uvicorn) + tests/
frontend/    Angular 22, zoneless (standalone, signals, Router)
             + Dockerfile (Node 24 Build → nginx) + nginx.conf + proxy.conf.json
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
`form-instruction/`), `features/` hat einen Ordner pro Route
(`practice/`, `rules/`, `stats/`, `words/`, `settings/`). Seit #31 gibt es kein
eigenes `layout/` mehr — die App-Chrome kommt aus Sumi UI (s. u.), `app/`
bleibt also bei `core/`, `shared/` und `features/`. Jede Komponente hat
Template und Styles in eigenen Dateien (`templateUrl`/`styleUrl`, nicht
inline) statt Template-Literalen im `.ts`. `app.config.ts` trägt die
`ApplicationConfig` (HttpClient, Router, `provideSumi()`), `main.ts` ruft nur
noch `bootstrapApplication(AppComponent, appConfig)`. Die Routen stehen in
`app.routes.ts` (vormals `routes.ts`).

- `app.component.ts` (#17, Chrome seit #31 `sumi-app-shell`) — Profil-Load
  beim Start (`api.loadProfile()`) plus die Shell-Verdrahtung: `brand` (活),
  `navItems` (Practice/Rules/Stats/Words/Settings, je mit Icon, Links relativ
  wie in sumi-ui's Showcase), `<sumi-app-switcher sumiShellSwitcher />` und
  `<sumi-hotkey-help />`. Level/Elo/Streak stehen als zwei `sumi-badge`s plus
  ein schmaler Fortschrittsbalken in `sumiShellActions` — kompakt genug für
  ein 360px-Handy neben der Marke. `app.component.css` zentriert den
  `<router-outlet />`-Inhalt nur noch auf ~640px (`.page`), ohne eigenes
  Padding: das liefert bereits `sumi-app-shell__main`, doppeltes Padding wäre
  sonst die Folge. Die Seiten selbst wandern erst in #34 auf `sumi-page`. Das
  Favicon ist dasselbe Zeichen als Inline-SVG-Data-URI in `index.html` — kein
  Asset, nichts synchron zu halten; die Füllung folgt dem Fuji-Akzent (s. u.).
  **Theme-Umschalter, Sticky-Header und Tab-Leiste kommen jetzt aus der
  Shell** — `core/theme.service.ts` und `layout/header/` sind mit #31
  entfallen, `sumi-app-shell` übernimmt Sticky-Positionierung, die
  Tab-Leiste unter 720px und den Theme-Toggle (`SumiTheme`, `data-theme` auf
  `<html>`) selbst.
- `features/practice/practice.component.ts` (#19, auf Sumi UI umgestellt #32) —
  Übungsansicht mit explizitem Session-Lebenszyklus (`idle` → `active` →
  `answered` → `ended`). Die Session startet **nicht** automatisch. Start-
  und Ende-Screen sind `sumi-session-gate` (`Enter` startet, von der
  Bibliothek selbst registriert); der Ende-Screen projiziert
  `sumi-session-summary` (`answered`/`correct`/`durationMs`/`delta`
  mit `deltaLabel="Elo"`) in den Gate statt eines eigenen Zusammenfassungs-
  Templates. Die aktive Runde steht in `sumiFocusMode` (blendet Navigation
  und Tab-Leiste aus), `sumi-session-bar` hängt **nicht** im Seiten-Template,
  sondern via `*sumiShellFocusActions` im Fokus-Bereich der Shell-Kopfzeile —
  ihr `(end)` ruft `end()` auf. Die alte „End session"-Ghost-Button-Zeile ist
  damit weg.

  Eingabe ist `sumi-answer-field` (`mode="kana"`, `[iDontKnow]="true"`, kein
  `iKnow` — das ist nur kanji-trainer). Die Bibliothek übernimmt Romaji→Kana-
  Konvertierung, Fokus-Halten, `incomplete`/`typing`/`correct`/`wrong` und die
  Hotkeys `Enter`/`Esc`/`Alt H` selbst; die app-eigene wanakana-Bindung,
  `romajiLeft`/`ready`/`scheduleSync` sind komplett entfallen (wanakana bleibt
  nur noch als `furigana.ts`-Abhängigkeit und Sumi-UI-Peer-Dependency im
  `package.json`). Check/Next ist ein `sumiButton` mit `sumiHoldFocus`, der
  `field.submit()` ruft — derselbe Mechanismus wie bei `sumiHoldFocus` sonst
  auch, nur dass der Jisho-Link (s. u.) weiterhin seinen eigenen
  `(mousedown)="keepFocus($event)"` braucht, weil es dafür keine Direktive
  gibt. Das Ergebnis vom Backend wird auf `SumiVerdict` (`kind: 'correct' |
  'wrong'`) gemappt — die App kennt kein `held`/`retry`, weil das Backend
  einmalig entscheidet. Dasselbe `verdict()`-Signal geht an `sumi-answer-
  field` **und** an `sumi-verdict`, exakt wie im Showcase.

  `countdown-ring`, `verdict` und `session-summary` als eigene Komponenten
  sind gelöscht. `sumi-countdown-ring` sitzt jetzt im App-eigenen Prompt-Card-
  Markup (das bleibt bestehen — `sumi-prompt-card` kann kein Furigana-`<ruby>`
  rendern, siehe `shared/furigana.ts`). Grammatik-Zeile, Partial-Hinweis
  (Stamm/Endung getrennt), Elo-Delta, Jisho-Link und Herleitungskette bleiben
  app-spezifisch, jetzt direkt in `PracticeComponent` statt in einer eigenen
  `VerdictComponent`, projiziert in `sumi-verdict`s `[sumiVerdictDetails]`-
  Slot. `F` schaltet diesen Slot um — registriert von `sumi-verdict` selbst,
  sobald der Slot Inhalt hat (hier immer). Er startet **offen**
  (`detailsOpen = signal(true)`): die Herleitungskette ist das Haupt-
  Lernmittel bei einem Fehler, sie soll nicht erst einen zweiten Tastendruck
  brauchen. Bibliothekseigene Titel („Correct"/„Wrong") ersetzen die alten
  正解/不正解-Headlines, die Lösung steht bei einem Fehler nur einmal, in
  `sumi-verdict`s `expected`-Zeile (nicht nochmal mit Furigana im Slot); die „fast"-Markierung auf eine richtige Antwort steht
  jetzt in `sumi-verdict`s `message`-Slot. Ein Alt+H-Abbruch zeigt zusätzlich
  eine eigene Zeile im Slot (kein Partial-Hinweis dafür — ohne Eingabe gibt es
  nichts, das stamm- oder endungs-richtig sein könnte). `?` bleibt als
  Seiten-Hotkey registriert (Scope `feedback`, aktiv sobald ein Ergebnis da
  ist) — genau wie im Showcase.

  Die Wortart-Titel kommen weiterhin aus `shared/word-types.ts`
  (`wordTypeTitle()`), geteilt mit `features/stats/stats.component.ts`. Der
  Jisho-Link (Kanji + Leerzeichen + Lesung im Suchpfad, setzt auch bei
  Homographen und suru-Verben den exakten Eintrag an erste Stelle) öffnet
  weiterhin in einem neuen Tab.
- `shared/form-instruction/form-instruction.component.ts` — rendert `Exercise.instruction` (eine
  geordnete Liste strukturierter Teile, siehe
  `backend/app/conjugation/instruction.py`) als Chip-Reihe, in einem von drei
  Stilen (`text` / `emoji` / `both`, Signal-Input `mode`). **Nicht `style`
  nennen** — das kollidiert mit der eingebauten DOM-Eigenschaft, die Angular
  auf jedem Host-Element schon bindet, ein gleichnamiger Component-Input bekäme
  nie einen Wert.
- `features/stats/stats.component.ts` (#20, Charts auf Sumi UI umgestellt
  #33) — lädt die Stats, Empty-/Loading-Zustand, Layout; behält die kleinen
  Karten (Weakest rules, Misses-Split, Recent) selbst. Die vier KPI-Kacheln
  sind `sumi-stat-tile` in einem `sumi-stat-grid` direkt im Template (die
  alte `kpi-tiles/`-Komponente brauchte dafür kein eigenes Wrapping mehr und
  ist weg); die Elo-Karte bleibt eine eigene `<section class="card">` mit der
  gewohnten Überschrift/Hinweiszeile, aber der Verlauf selbst ist jetzt
  `sumi-sparkline` (`[points]="elo_history"`, `[value]` das gerundete Elo,
  `[delta]` letzter minus erster Punkt der Historie, `null` unter zwei
  Punkten — dann fehlt der Chart ganz, wie vorher auch; die alte
  `elo-sparkline/`-Komponente mit eigener SVG-Polyline ist damit auch weg).
  `sumi-sparkline` selbst zeigt nur den aktuellen Wert plus Delta, keine
  Min/Max-Skala — die Spanne steht deshalb in der Hinweiszeile
  („Range 905–1184.", `eloRange()` in `stats.component.ts`), sonst wäre eine
  Aussage der alten Seite nur noch über den Tabellen-Fallback zu erschließen.
  Eine Skalenzeile unter dem Chart landete hinter „Show as table" und damit
  vom Chart getrennt. Die vier Kacheln stehen ab 481px per App-CSS in einer
  Reihe: das `auto-fit`-Grid der Bibliothek machte bei 640px Seitenbreite
  3 + 1 daraus.
  - `miss-rate-heatmap/miss-rate-heatmap.component.ts` — als Kernstück **drei**
    `sumi-matrix-heatmap`s: Form × Wortart für Adjektive, dasselbe für Verben,
    und eine dritte mit einer einzigen Zeile „Godan" und den neun
    Trigger-Kana als Spalten (ersetzt die alte Chip-Reihe). Ein gemeinsames
    `selected`-Signal (welche Matrix + Zeile + Spalte + Payload) treibt eine
    einzige Readout-Zeile unter allen drei Matrizen — `selectedCellFor(id)`
    gibt nur für die tatsächlich ausgewählte Matrix ein `{row, column}`
    zurück, die anderen beiden bekommen `null`, sonst würde die Ring-Markierung
    in mehreren Matrizen gleichzeitig aufblitzen. Kodiert wird weiterhin die
    **Fehlerquote** (`1 - accuracy`), nicht die Trefferquote, über
    `[domain]="[0, 1]"` und `format` = Prozent. „Noch nie geübt" ist
    `sumi-matrix-heatmap`s eigener „no data"-Zustand (`value: null`,
    `detail: 'not practised yet'`) — eine gestrichelte Schraffur statt des
    hellsten Rampenschritts, genau wie vorher, nur jetzt von der Bibliothek
    selbst gezeichnet. Die Spaltenköpfe sind die kurzen Wortart-Labels
    (`wordTypeLabel()`, z. B. „一段"); den vollen Titel liefert nicht ein
    Spalten-Tooltip (den gibt die Bibliothek für Spaltenköpfe nicht her),
    sondern die Readout-Zeile, die `selectable`s `cellSelect` auch bei
    reinem Hover feuert — „<Formtitel> · <voller Wortart-Titel>" bzw.
    „Godan <Trigger>" für die dritte Matrix, je über eine
    `columnTitles`-Lookup pro Matrix (leer bei Godan, da die Zeile dort schon
    „Godan" sagt). Jede Matrix hat `table` für den Tabellen-Fallback.

  `stats-math.ts` trägt den testbaren Kern als freie Funktionen statt
  Komponenten-Methoden: `toCell()`, `rowsFor()`, `triggerCells()` (Godan-
  Gruppierung + ja-Sortierung, liefert jetzt die bloße Trigger-Kana als
  `label` — „Godan " ist seit #33 Sache der Zeile, nicht mehr der Zelle),
  dazu die `Cell`/`HeatRow`-Typen und `VERB_TYPES`/`ADJECTIVE_TYPES`. `bucket()`,
  `HEAT_BOUNDS`, `HEAT_LABELS` und `sparkline()` sind mit #33 entfallen — das
  Bucketing und die Sparkline-Geometrie macht jetzt die Bibliothek (linear in
  20-%-Schritten über `[domain]`, nicht mehr die alten 10/25/45/70-Grenzen;
  Bibliothekskonsistenz hat hier Vorrang). `stats-math.spec.ts`
  deckt Summation/„nie geübt" in `toCell()` und die Godan-Sortierung ab, ohne
  TestBed.
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
- Light + Dark über Sumi UIs `--sumi-*` CSS Custom Properties (#31, vormals
  die App-eigenen `styles/tokens.css`, #18).

**Sumi UI (#31).** `frontend/sumi-ui` ist ein Git-Submodule
(`tkober/sumi-ui`, siehe dessen README „Using Sumi UI in an app") — **kein
`npm install` darin**, es kompiliert gegen die Pakete der App. Eingebunden
über `tsconfig.json`-`paths` (`sumi-ui/*` → `./sumi-ui/projects/sumi-ui/src/*`,
TypeScript-Quellen direkt, kein eigener Library-Build) und einen Sass-
Load-Path (`stylePreprocessorOptions.includePaths: ["."]` in `angular.json`,
damit `src/styles.scss` einfach `@use 'sumi-ui/projects/sumi-ui/styles/sumi'`
schreiben kann). Sumis Font-`@font-face`-Regeln laufen als eigener,
nicht injizierter Build-Output (`sumi-fonts.css`, `bundleName`, `inject: false`
in `angular.json`) und werden in `index.html` separat, nicht-blockierend
verlinkt — `frontend/nginx.conf` hat dafür ein `location = /sumi-fonts.css`
mit `no-cache`, weil der Dateiname fix bleibt und sonst ein Jahr lang
gecacht würde. `app.config.ts` ruft `provideSumi({ accent: 'fuji', motif:
'bamboo' })` — **Platzhalter**, das endgültige Design kommt erst mit
tkober/sumi-ui#25, deshalb bewusst kein `pattern` und nichts weiter fest
verdrahtet. CI checkt das Submodule aus (`actions/checkout@v4` mit
`submodules: true` in `frontend-ci.yml`/`publish-frontend.yml`; der
`paths: frontend/**`-Filter deckt einen Submodule-Bump schon ab, weil
GitHubs Pfad-Globs `**` auch auf `frontend/sumi-ui` selbst matchen), ein
`dependabot.yml` mit `gitsubmodule`-Ecosystem hält es aktuell.

**Globale Styles (#31, vormals #18)** liegen in `src/styles.scss`: zuerst
`@use 'sumi-ui/projects/sumi-ui/styles/sumi'` (Sumis `--sumi-*`-Tokens plus
Basisstile), danach die App-eigenen Reste als `@use` von drei plain-CSS-
Dateien — `styles/app-tokens.css` (die Tokens, die Sumi UI nicht hat, s. u.),
`styles/base.css` (was Sumis eigene `_base.scss` noch nicht abdeckt:
`html`/`body`-Mindesthöhe, `button`, `input`; `:focus-visible`,
`box-sizing` und der Schrift-Stack kommen jetzt von Sumi) und
`styles/components.css` (`.card`, `.hint`, `button.primary`, `h2` — bleiben
bis #34 auf Sumi-Tokens laufend bestehen, dann wandern sie auf Sumi UIs
eigene Komponenten). Jedes App-Token steht weiterhin **genau einmal**, mit
`light-dark(hell, dunkel)`, exakt wie Sumi es selbst für seine Tokens macht.
`--rule-accent` (Herleitungskette) bleibt als einziges App-Token in
`styles/app-tokens.css` übrig, weil Sumi UI dafür keine Entsprechung hat
(sekundäre Farbe, bewusste Nutzerentscheidung) — `--neutral`
(Countdown-Ring, bis #32) und `--heat-0…4`/`--spark` (Heatmap/Sparkline, bis
#33) sind beide inzwischen entfallen. Jede
andere `var(--…)`-Nutzung in den Feature-Styles ist auf die passende
`--sumi-*`-Variable umgeschrieben (`--bg`→`--sumi-bg`, `--surface`→
`--sumi-surface`, `--surface-sunken`→`--sumi-sunken`, `--border`→
`--sumi-line`, `--text`→`--sumi-text`, `--text-muted`→`--sumi-muted`,
`--accent(-soft)`→`--sumi-accent(-soft)`, `--correct(-soft)`→
`--sumi-correct(-soft)`, `--wrong(-soft)`→`--sumi-wrong(-soft)`, `--shadow`→
`--sumi-shadow`, `--radius`→`--sumi-radius`; weißer Text auf Akzent wurde zu
`--sumi-on-accent`).

**Die Heatmap-Rampe ist seit #33 kein App-Token mehr.** Bis dahin war sie
eine eigene, validierte Ein-Hue-Skala (blau) in `styles/app-tokens.css`
(`--heat-0…4`/`--spark`), im Dark Mode umgedreht, gegen die tatsächlichen
Flächen dieser App (`#ffffff`/`#1c1f25`) validiert. `sumi-matrix-heatmap`
und `sumi-sparkline` zeichnen jetzt aus der akzentabgeleiteten
`--sumi-seq-*`-Rampe der Bibliothek selbst — eine zweite, separat zu
pflegende Skala wäre reine Doppelung gewesen, und die Bildunterschrift sagt
weiterhin bewusst „stronger", nicht „darker" (die Bibliotheksrampe ist
ebenfalls themefest, „dunkler" wäre im Dark Mode so oder so falsch). Wer an
dieser Stelle nochmal Farben prüfen will, validiert gegen `--sumi-seq-*`,
nicht gegen die alten, inzwischen entfernten `--heat-*`-Werte.

**Komponenten laufen auf `OnPush`, die App ist seit #29 zoneless**
(`provideZonelessChangeDetection()` in `app.config.ts`, kein `zone.js` mehr in
`package.json`/`angular.json`). Aller Zustand liegt in Signals, damit Change
Detection an Signal-Writes hängt statt an zone.js — das hat sich beim Umstieg
ausgezahlt: kein Component musste angepasst werden, weil hier noch nie etwas
auf zone.js-gepatchte Callbacks statt auf Signal-Writes vertraut hat (siehe
wanakana unten).

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
| – | #29: Frontend-Upgrade auf Angular 22, zoneless | fertig |

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
- **Die Romaji→Kana-Konvertierung ist seit #32 Sache von `sumi-answer-field`**
  (`mode="kana"`), nicht mehr der App. Der alte wanakana-Workaround
  (verzögertes Lesen per `setTimeout`+`keyup`, weil wanakana das Feld aus
  seinem eigenen Listener umschreibt und nicht immer im selben Task) ist mit
  der App-eigenen Bindung entfallen — die Bibliothek hält ihren eigenen
  Romaji-Puffer (`absorbInput`) hinter dem sichtbaren `value`.
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
- **Japanisch braucht eine explizite Schrift im Font-Stack** (#13, seit #31
  Sumi UIs Sache). Ohne sie greift Chrome unter Windows auf Yu Gothic zurück
  (bei `lang="en"` auch auf eine chinesische Schrift), und die wirkt bei
  normaler Strichstärke dünn und drahtig. Sumi UIs `_base.scss` nennt dafür
  für `[lang='ja']`/`.sumi-jp` Zen Kaku Gothic New, Hiragino, Yu Gothic und
  Noto Sans JP; die eigentlichen Fonts (Murecho, Zen Kaku Gothic New, IBM
  Plex Mono) liefert die App als `@fontsource/*`-Pakete (`peerDependencies`
  der Bibliothek), eingebunden über den separaten `sumi-fonts.css`-Build
  (s. o.), nicht über Google Fonts. Das alte `@fontsource-variable/
  noto-sans-jp` ist mit #31 raus — Sumis Fonts decken Latin wie Kana/Kanji
  jetzt ab.
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
  Der `@media (max-height: 500px)`-Block in `practice.component.css` (seit #32
  nur noch diese eine Datei, vorher zusätzlich auf `countdown-ring/`,
  `verdict/`, `session-summary/` verteilt, die mit #32 entfallen sind) stutzt
  die Übung genau darauf, damit beim Tippen ins Feld gar nichts mehr zu
  scrollen ist.
- **Die Tastatur geht nur für einen Fokus auf, den der Nutzer ausgelöst hat**
  — einmal offen, darf sie zwischen zwei Übungen also nie verloren gehen. Das
  ist seit #32 Sache von `sumi-answer-field`: nie `readonly`, nie geblurred,
  ein `effect()` in der Bibliothek fokussiert das Feld bei jedem Verdict-
  Wechsel (auch zurück auf `null`) neu — die App muss nach einem Check/Next
  nicht mehr selbst `focus()` aufrufen. `sumiHoldFocus` auf dem Check/Next-
  Button und dem Jisho-Link (dort weiterhin ein lokales
  `(mousedown)="keepFocus($event)"`, weil ein `<a>` keine Button-Direktive
  ist) verhindert nur noch, dass der Fokus beim Antippen überhaupt wegwandert.
- Mit stehender Tastatur passen Aufgabe, Eingabe *und* Auflösung nicht
  gleichzeitig auf den Schirm. Nach dem Prüfen rückt deshalb die Zeile mit
  `sumi-answer-field` unter den Header (`revealVerdict()`: `scrollIntoView`
  mit `scroll-margin-top`), damit Korrektur und „Next" sich den sichtbaren
  Streifen teilen. Die Header-Höhe wird seit #32 live gemessen
  (`.sumi-app-shell__header`) statt als Konstante eingetragen — die alten
  104px stammten vom App-eigenen Header. Ohne das Scrollen geht es nicht: das
  Feld behält den Fokus, verliert ihn also nie, und der Browser scrollt es
  deshalb auch nicht von selbst in Sicht (gegengeprüft bei 360×380).
