# Conjugation Trainer

Selbst-gehostete Web-App zum Üben japanischer Konjugationen: Ein Verb oder
Adjektiv wird mit einer Zielform gezeigt, du tippst die konjugierte Form in
Kana. Die App wertet Stamm und Endung getrennt aus, passt die Schwierigkeit
laufend an und übt gezielt die Regeln, die noch wackeln.

## Starten (Docker)

```bash
docker compose up --build -d
```

Dann <http://localhost:8084> öffnen. Der Stack besteht aus drei Containern:
Postgres, dem FastAPI-Backend und einem nginx, das die Angular-App ausliefert
und `/api` ans Backend weiterreicht. Der Fortschritt liegt im Volume
`conjugation-db` und überlebt Neustarts und Rebuilds.

## Features

- **Adaptive Auswahl** — User, Konjugationsregel und Vokabel tragen je ein
  Elo-Rating. Eine Aufgabe ist ein Paar aus Regel und Wort, und das Wort wird so
  gewählt, dass das Paar auf deinem Niveau landet: eine schwere Regel holt sich
  ein leichtes Wort und umgekehrt. Dazu Probe-Aufgaben oberhalb, Wiederholungen
  unterhalb und ein Zeit-Malus für alles, was lange nicht dran war.
- **Feine Körnung** — geübt wird nicht „Te-Form", sondern *Te-Form × Wortart ×
  Endung*. Dass bei ぐ-Verben noch etwas hakt, während む sitzt, ist damit eine
  Sache, die die App weiß. 256 Übungsitems statt 96.
- **Auswertung nach Stamm und Endung** — „richtig konjugiert, Wort falsch
  gelesen" ist ein anderer Fehler als „richtig gelesen, falsch konjugiert", und
  wird auch so gewertet.
- **Herleitung bei der Auflösung** — 塞ぐ → 塞 + いで, wie die Regel es macht.
- **Zeitbudget** pro Antwort mit Countdown-Ring, einstellbar (Tippen auf dem
  Handy dauert länger als auf einer Tastatur).
- **Kein Intervall-SRS.** Konjugationsregeln sind prozedurales Wissen — es gibt
  keine Karten-Queue und kein „für heute fertig". Warum, steht in
  [CLAUDE.md](CLAUDE.md).

## Entwicklung

```bash
docker compose up -d postgres                        # DB auf :5432
cd backend && cp .env.example .env                   # DB_*-Variablen füllen
cd backend && uv run uvicorn app.main:app --reload   # API auf :8000
cd frontend && npm start                             # UI auf :4200 (Proxy → :8000)
cd backend && uv run pytest                          # Tests (starten selbst ein Postgres)
```

Das Vokabular liegt als JSON in [data/vocabulary/](data/vocabulary/) und kommt
aus [jisho-crawler/](jisho-crawler/) (`./crawl_jisho.sh`).

## Deployment

Backend und Frontend werden von GitHub Actions als getrennte Images nach GHCR
gebaut (`ghcr.io/tkober/jp-conjugation-backend` bzw. `…-frontend`). Sie
verbinden sich mit zwei Rollen gegen eine bestehende Postgres-Instanz:
`conjugation_owner` (nur beim Start, für DDL + Seeding) und `conjugation_app`
(alle Requests). Das einmalige Anlegen von Datenbank und Rollen erledigen
[dbeaver/create_users_and_db.sql](dbeaver/create_users_and_db.sql) und
[dbeaver/grant_privileges.sql](dbeaver/grant_privileges.sql).

Mehr Details für (Coding-)Agenten und Menschen: [CLAUDE.md](CLAUDE.md).
