# Feind Cockpit v1.0

> **Archiv (Stand 30.09.2026):** Dieser Ordner ist der ältere A4-Stand. A4 ist gelöscht; live und führend ist
> A1 (https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd), Quelle unter `cockpit-a1/`.

Ein Artefakt für Marketing, InfraTech 2027 und Administration. Die Seite
`Feind-Cockpit.html` ersetzt vier bisher getrennte Artefakte und führt deren Daten in
**einem** Artefakt-Speicher (`db`) zusammen.

## Zweck: Konsolidierung von vier Artefakten

| Kürzel | Titel | Adresse | Übernommen in |
|---|---|---|---|
| A1 | Feind Marketing Cockpit | https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd | Welt Marketing |
| A2 | Feind Marketing-Cockpit | https://claude.ai/artifact/HV74Zf9U136ajuJefJutvu | Welt Marketing, Admin |
| A3 | ToDo-Liste InfraTech 2027 | https://claude.ai/artifact/2FT2wp4m4YfwJvU1Hj5vFd | Welt InfraTech (Aufgaben) |
| A4 | InfraTech 2027 Cockpit | https://claude.ai/artifact/4zX58mseXB9vbspN8xAzJ2 | Welt InfraTech |

Die Altartefakte bleiben unverändert bestehen, bis die Migration abgeschlossen und geprüft ist.
Live-Bestand am 28.09.2026 siehe `docs/SCHEMA.md`, Abschnitt „Migration“.

## Aufbau: drei Welten

**Marketing – 8 Module** (`MKT_MODULES`)

| Schlüssel | Titel | Sammlung(en) | Datenquelle (Skill) |
|---|---|---|---|
| `copilot` | Copilot · Tagesbrief | `briefings/<JJJJ-MM-TT>` | Copilot / KI-Briefing |
| `content` | Content-Pipeline | `content` | `content-pipeline` |
| `mkt_leads` | Lead-Pipeline | `mkt_leads` | `lead-tracking` |
| `tenders` | Ausschreibungs-Monitor | `tenders` | `tender-monitoring` |
| `events` | Event-Planung | `events` | `event-planning` |
| `seo` | SEO & Website | `seo_keywords`, `seo_traffic`, `seo_gaps` | `seo-local` |
| `references` | Referenz-Bibliothek | `references` | `reference-library` |
| `plan90` | 90-Tage-Plan & Zeitplan | – (Notion live bzw. Snapshot) | Connector „Notion“ |

**InfraTech 2027 – 14 Module** (`INFRA_TABS`): Dashboard, Aufgaben, Fristen, Budget,
Ziele & KPIs, Lead-Zähler, Akquise-Planer, Packen & Material, Vorlagen, Lessons Learned,
Faktencheck, Team & Zugriff, Protokoll, Wissensbasis.

**Admin – 10 Bereiche** (`ADMIN_SECS`): Status, Schwellen & Regionen, Module & Reiter,
Hinweis & Links, Funktionen & Quellen, Zugänge, Datenpflege, Migration, Weiterentwicklung,
Protokoll. Bedienung: `docs/ADMIN-HANDBUCH.md`.

## Dateien im Ordner `cockpit/`

| Pfad | Inhalt |
|---|---|
| `Feind-Cockpit.html` | Die Seite (eine Datei). Fachlogik im Block `<script id="feind-core">` (`FeindCore`), eingebetteter 90-Tage-Plan-Snapshot in `<script id="plan90">` |
| `docs/SCHEMA.md` | Verbindliches Datenschema, Kollisionen, Migrationsregeln |
| `docs/ADMIN-HANDBUCH.md` | Handbuch für Admins |
| `tools/migrate.mjs` | Offline-Migration: erzeugt aus JSON-Exporten einen prüfbaren Schreibplan |
| `test/` | Unit-Tests für `FeindCore` (`core.test.mjs`) mit Testdaten in `test/fixtures/` |
| `e2e/` | Playwright-Smoke-Tests, `mock-claude.js` simuliert die claude-Laufzeit |
| `playwright.config.mjs` | Konfiguration der E2E-Tests (Chromium, `file://`, de-DE, Europe/Berlin) |

## Datenhaltung (Kurzform)

Alle Daten liegen im Artefakt-Speicher (`db`), nicht im HTML. Verbindlich ist
`docs/SCHEMA.md`.

- Marketing: `content`, `mkt_leads` (vorher `leads`), `tenders`, `events`, `seo_*`,
  `references`, `briefings`, `meta/sync`, `settings/general` (nur Marketing-Schwellen).
- InfraTech: `tasks`, `settings/infratech`, `budget/actuals`, `leads/counts` (nur Stückzahlen),
  `acquisition/plan`, `planning/materials`, `activity` (max. 400 Einträge), `overrides` (Altbestand, nur lesen).
- Admin: `admin/config`, `admin/draft`, `admin/roles`, `admin_requests/<userId>`.
- Brücke zwischen den Welten: `events/infratech-2027`.
- Keine personenbezogenen Daten Dritter. Leads nur als Organisation, Personen nur als opake Konto-ID.
- Nichts wird hart gelöscht: Aufgaben werden archiviert, Migrationsquellen nur markiert.

## Offline-Verhalten

Ohne claude.ai (z. B. Datei lokal geöffnet) gibt es keinen geteilten Speicher. Die Seite
zeigt dann das Banner „Offline-Modus“:

- **InfraTech** bleibt voll nutzbar. Änderungen werden in `localStorage` gespeichert
  (`feind_cockpit_it_v1`, Altbestand `feind_infratech2027_v2` wird gelesen) und gelten nur für
  dieses Gerät und diesen Browser.
- **Marketing** zeigt den zuletzt geladenen Zwischenstand (`feind_cockpit_mkt_cache_v1`)
  **nur lesend**. Gibt es keinen, erscheinen Marketing-Daten erst mit Live-Verbindung.
- **Admin** ist offline gesperrt.
- Der 90-Tage-Plan zeigt den eingebetteten Notion-Snapshot.

Für den gemeinsamen Teamstand das Cockpit immer über den Artefakt-Link in claude.ai öffnen.

## Rechte

| Freigabe (Teilen-Menü) | Darf |
|---|---|
| Viewer | alles lesen |
| Contributor | Daten pflegen: Aufgaben, Zähler, Checklisten, Briefings; eigene Admin-Anfrage stellen |
| Editor / Owner | zusätzlich Admin-Konfiguration, Datenpflege, Migration |

Serverseitig durchgesetzt durch die DB-Regel `{ path: "admin", write: "admin" }`: Unter
`admin/*` schreiben nur Editor und Owner. `admin/roles` steuert nur, wer den Admin-Bereich
**sieht**, nicht, wer schreiben darf. Die Seite blendet Schreib-Bedienelemente aus, wenn
`user.can('data.write')` fehlt.

## Capabilities beim Veröffentlichen

```json
{
  "db": { "rules": [ { "path": "admin", "write": "admin" } ] },
  "user": { "scopes": ["profile"] },
  "sample": {},
  "downloads": true,
  "assets": {},
  "mcp": { "servers": [ { "server": "Notion", "tools": ["notion-query-data-sources"] } ] }
}
```

| Capability | Wofür |
|---|---|
| `db` | geteilter Speicher, Admin-Schreibschutz |
| `user` (`profile`) | Konto-ID und Anzeigename, Rolle (Owner/Editor) |
| `sample` | KI-Briefings (Tagesbrief, Messe-Briefing) |
| `downloads` | Exporte (JSON, Backup); ohne sie Browser-Download bzw. Zwischenablage |
| `assets` | Anhänge an Aufgaben |
| `mcp` Notion `notion-query-data-sources` | 90-Tage-Plan live aus Notion |

Form geprüft gegen Laufzeitvertrag 0.2.61 (`server` = Anzeigename des Connectors, `tools` = Upstream-Toolnamen).
Der `mcp`-Eintrag bewirkt eine Zustimmungsabfrage beim ersten Aufruf und schließt öffentliches Teilen aus.

## Befehle

```bash
npm run test:cockpit                                   # Unit-Tests FeindCore
npm run e2e:cockpit                                    # Playwright-Smoke-Tests (Chromium)
npm run migrate:cockpit -- --target backup.json \
  [--a2 a2.json] [--a3 a3.json] [--out plan.json]      # Migrationsplan offline berechnen
```

`migrate:cockpit` schreibt nichts in den Speicher. Mit `--out` entsteht ein Plan in Paketen
zu höchstens 50 Schreibvorgängen für `ArtifactData batch`. Eingaben: Cockpit-Backup
(`{ collections: … }`), einfaches Objekt (`{ <sammlung>: [ … ] }`) oder Ordner im
`<ordner>/<sammlung>/<id>.json`-Layout.

## Live-Artefakt

- Adresse: https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd (A1, seit 30.09.2026 live und führend;
  Quelle `cockpit-a1/`). Diese Adresse nutzt auch der Skill `cockpit-sync`.
- Historisch: A4 (https://claude.ai/artifact/4zX58mseXB9vbspN8xAzJ2) ist gelöscht; die folgenden
  Angaben beziehen sich auf A4.
- Veröffentlicht am: 28.09.2026 (Version 13, Laufzeitvertrag 0.2.61)
- Capabilities geprüft: 28.09.2026 – Lesen als Contributor ok, Schreiben unter `admin/*` als Contributor
  abgewiesen, Notion-View liefert `results` wie erwartet
- Migration: 28.09.2026, 3 Schreibvorgänge, 0 Löschungen (`tasks/i1` aus `overrides/i1`,
  `overrides/i1` markiert, `events/infratech-2027` aus A2)

Der Skill `/cockpit-sync` liest die Zieladresse aus diesem Abschnitt. Ist sie leer, schreibt er nichts.

## Entscheidungen

- [x] **Primär-Buttons:** Schrift in `on-accent-strong` `#1f2525` auf Grün (6,9:1). Entschieden 28.09.2026.
- [x] **Ziel-Artefakt für Go-Live:** InfraTech-Artefakt A4 (4zX58mseXB9vbspN8xAzJ2) wird aktualisiert.
      Entschieden 28.09.2026.
- [x] **Live-Migration:** ausgeführt 28.09.2026 (siehe oben).
- [ ] **Führende Quelle Team-Aufgaben:** Vorschlag David: Notion. Konzept offen. Entscheidung: _…_
- [ ] **Innovationspreis-Teilaufgaben i2–i5:** Status klären (übernommen ist nur `overrides/i1`
      „Innovationspreis eingereicht“). Entscheidung: _…_
