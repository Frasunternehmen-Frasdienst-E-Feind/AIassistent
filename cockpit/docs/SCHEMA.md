# Feind Cockpit – Datenschema (Artefakt-Speicher `db`)

Stand: 28.09.2026 · gilt ab Cockpit v1.0 · eine Quelle für Seite, Skill `/cockpit-sync`,
Manager-Agent und Migration.

## Grundsätze

- Ein Artefakt hat **einen** Speicher. Dort liegen alle drei Welten, und die Namensräume
  überschneiden sich nicht (siehe Kollisionen unten).
- **Keine personenbezogenen Daten Dritter.** Leads erscheinen nur als Organisation oder als
  Stückzahl. Personen werden ausschließlich als opake Konto-ID (`u_…`) gespeichert, den Namen
  löst die Seite erst bei der Anzeige auf.
- **Nichts wird hart gelöscht.** Aufgaben werden archiviert (`archived: true`). Migrationen
  markieren ihre Quellen nur mit `migratedAt` / `migratedTo`.
- `set()` ersetzt immer das **ganze** Dokument, denn der Speicher kennt kein `merge`. Wer
  ein Dokument teilweise ändern will, nutzt `update()`, das nur auf bestehenden Dokumenten
  funktioniert.
- Grenzen: höchstens 5.000 Dokumente pro Artefakt, 256 KiB pro Dokument. Das
  Aktivitätsprotokoll wird deshalb auf 400 Einträge gekürzt.

## Marketing-Welt

| Pfad | Inhalt | Schreiber |
|---|---|---|
| `content/<id>` | `{ title, channel, status, plannedDate, publishedDate, statusSince, region, projectType, note }` | Skill `content-pipeline` / `/cockpit-sync` |
| `mkt_leads/<id>` | `{ organisation, orgType, channel, stage, service, region, landkreis, valueBand, lastContact, createdAt, nextAction, nextActionDate }`, **nur Organisationen** | Skill `lead-tracking` (**umbenannt, vorher `leads`**) |
| `tenders/<id>` | `{ title, authority, region, bundesland, deadline, status, fit, fitReason, cpv[], portal, url, distanceKm }` | Skill `tender-monitoring` |
| `events/<id>` | `{ title, type, date, endDate, location, region, checklist:[{area,item,done}], followupStatus, leadsCaptured, notes, slug }` | Skill `event-planning`. **`events/infratech-2027` = Brücke zur InfraTech-Welt** |
| `seo_keywords/<id>`, `seo_traffic/<JJJJ-MM>`, `seo_gaps/<id>` | wie bisher | Skill `seo-local` |
| `references/<id>` | `{ title, year, region, client, clientApproved, services[], facts[], summary, feedback, files[] }` | Skill `reference-library` |
| `briefings/<JJJJ-MM-TT>` | Marketing-Tagesbrief `{ date, kind:'marketing', summary, items[], weekPlan[], generatedBy, createdAt }` | Copilot / Seite |
| `briefings/<JJJJ-MM-TT>-messe` | Messe-Briefing InfraTech, gleiche Form mit `kind:'messe'` | Seite (KI) |
| `meta/sync` | `{ <modul>: { at, source } }` | `/cockpit-sync` |
| `settings/general` | **nur** Marketing-Schwellen `{ staleDraftDays, followupDays, tenderRedDays, tenderYellowDays, regions[] }` | Admin (Veröffentlichen) |

## InfraTech-2027-Welt

| Pfad | Inhalt |
|---|---|
| `tasks/<id>` | Änderung über den Seed: `{ id, title, cat, prio, owner(Rolle), due, status: open\|in_progress\|blocked\|deferred\|done, note, flags[], deps[], budget, decision, archived, links[], attachments[{id,name,type}], custom, updatedAt }` |
| `settings/infratech` | `{ team:[{ id, role, userId? }], reminders:{ leadDays[], escalateDays }, updatedAt }` (**neu, vorher lag das in `settings/general`**) |
| `budget/actuals` | `{ blocks:{ <euroKey>:{ forecast, ist } }, updatedAt }` |
| `leads/counts` | `{ days:{ <JJJJ-MM-TT>:{a,b,c} }, follow:{a,b,c}, updatedAt }`, **nur Stückzahlen** |
| `acquisition/plan` | `{ slots:{ "<JJJJ-MM-TT>#<0\|1>":{target,note,done} }, targets:[{id,name,segment,done}] }`, nur Firmen |
| `planning/materials` | `{ packing[], giveaways[], vendors[], updatedAt }` |
| `activity/<id>` | `{ ts, actorId, action, detail }` mit opaker Konto-ID, max. 400 Einträge |
| `overrides/<id>` | Altbestand v1 `{ status, note }`, wird nur noch gelesen und per Migration nach `tasks` übernommen |

## Admin-Welt

| Pfad | Inhalt | Schutz |
|---|---|---|
| `admin/config` | Live-Konfiguration `{ version, defaultWorld, defaultTab, modules, announcement, links[], features, thresholds, regions, roadmap[], changelog[], title }` | DB-Regel `write: admin` |
| `admin/draft` | Entwurf (gleiche Form) | DB-Regel `write: admin` |
| `admin/roles` | `{ admins:[userId] }`, steuert nur die **Sichtbarkeit**; Schreiben erfordert Editor/Owner | DB-Regel `write: admin` |
| `admin_requests/<userId>` | `{ reason, at, status, decidedAt, decidedBy }` | Contributor schreibt eigene Anfrage |

### Zugriffsregeln (bei Veröffentlichung deklarieren)

```json
{ "db": { "rules": [ { "path": "admin", "write": "admin" } ] },
  "user": { "scopes": ["profile"] }, "sample": {}, "downloads": true, "assets": {} }
```

Viewer lesen, Contributor pflegen Aufgaben, Zähler und Checklisten, Editor/Owner zusätzlich
die Admin-Konfiguration. Die Seite liest `user.can('data.write')` und blendet
Schreib-Bedienelemente sonst aus. Das Banner „Nur Lesen“ erscheint auch nach einem
abgelehnten Schreibversuch.

## Kollisionen (aufgelöst)

| Kollision | Vorher | Jetzt |
|---|---|---|
| Marketing-Leads und Messe-Zähler teilen sich `leads` | A2 `leads/<id>`, A4 `leads/counts` | `mkt_leads/<id>` bzw. `leads/counts` |
| Team (InfraTech) überschreibt Marketing-Schwellen | beide in `settings/general`, `set()` ersetzt das Dokument | `settings/infratech` getrennt |
| `overrides` wird angezeigt, aber nie ausgewertet | Status „Innovationspreis erledigt“ unsichtbar | Migration nach `tasks/i1` |

## Migration

Die Regeln stehen in `FeindCore.planMigration` (Seite und `tools/migrate.mjs`):

1. `leads/<id>` (Marketing) → `mkt_leads/<id>`. `leads/counts` bleibt unberührt, die Quelle bekommt `migratedTo`.
2. `overrides/<id>` → `tasks/<id>`. Übernommen werden nur Felder, die dort fehlen; die Quelle bekommt `migratedAt`.
3. A3 `erfassung/<id>` → `tasks/a3-<id>` mit Status, Frist, Budget, Beschluss und Notiz. **Verantwortliche Personen werden nicht übernommen.**
4. A2-Sammlungen (`content`, `tenders`, `events`, …) werden nur ergänzt. Bei einem Konflikt bleibt der Stand im Ziel erhalten.
5. `admin/config` und `admin/roles` werden nur übernommen, wenn es im Ziel noch keine gibt.

Live-Bestand am 28.09.2026 (read-only geprüft): A2 hat 1 Dokument (`events/infratech-2027`),
A4 hat 1 Dokument (`overrides/i1`, Innovationspreis eingereicht), A3 ist leer, A1 ist leer.
