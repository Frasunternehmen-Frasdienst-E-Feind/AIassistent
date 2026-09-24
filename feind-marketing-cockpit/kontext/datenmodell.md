# Datenmodell – Artefakt-Speicher (`db`) des Marketing Cockpits

Einzige Datenquelle des Dashboards. Der Feind Copilot und die Skills schreiben hier
(in Claude Code / Cowork über das Werkzeug `ArtifactData`, Aktionen `set`, `update`,
`batch`, `list`, `query`), das Dashboard liest live (`onSnapshot`).
Dashboard-URL: `{{DASHBOARD_URL}}`

Grundregeln
* Datum immer `JJJJ-MM-TT`, Zeitstempel ISO 8601. IDs: kleinbuchstaben-mit-bindestrich.
* **Keine personenbezogenen Daten**: keine Namen, E-Mail-Adressen oder Telefonnummern
  von Ansprechpartnern. Firmen/Behörden als Organisation ja, Personen nein.
* **Keine Preise/Kalkulationen** (nur optional `valueBand`: "<10k" | "10-50k" | "50-150k" | ">150k").
* Jeder Datensatz trägt `source` (Datei, Connector oder "manuell: David") – Output-Regel 5.
* Kundennamen in `references` nur mit `clientApproved: true` anzeigen.

| Pfad | Felder |
|---|---|
| `content/<id>` | `title, channel ("linkedin"\|"website"\|"newsletter"\|"referenzbericht"), status ("idee"\|"entwurf"\|"review"\|"freigegeben"\|"veroeffentlicht"), region, projectType, plannedDate, publishedDate?, statusSince, source, note?` |
| `leads/<id>` | `organisation, orgType ("bauunternehmen"\|"kommune"\|"behoerde"\|"ingenieurbuero"\|"sonstige"), stage ("neu"\|"qualifiziert"\|"angebot"\|"verhandlung"\|"gewonnen"\|"verloren"), channel ("website"\|"linkedin"\|"empfehlung"\|"ausschreibung"\|"messe"\|"telefon"), region, landkreis, service, valueBand?, createdAt, lastContact, nextAction, nextActionDate, source` |
| `tenders/<id>` | `title, authority, cpv: [string], region, deadline, portal, url, fit ("passt"\|"pruefen"\|"passt_nicht"), fitReason, status ("neu"\|"in_pruefung"\|"angebot"\|"abgegeben"\|"verworfen"), foundAt, source` |
| `events/<id>` | `title, type ("messe"\|"tag_der_offenen_tuer"\|"baustellenbesichtigung"\|"sonstiges"), date, endDate?, location, checklist: [{area ("sicherheit"\|"ansprechpartner"\|"materialien"\|"verkehrssicherung"\|"nachbereitung"), item, done: bool}], leadsCaptured: number, followupStatus ("offen"\|"laeuft"\|"erledigt"), source` |
| `seo_keywords/<id>` | `keyword, region, position, previousPosition?, url, clicks, impressions, checkedAt, source` |
| `seo_traffic/<JJJJ-MM>` | `month, clicks, impressions, ctr, avgPosition, sessions?, source` |
| `seo_gaps/<id>` | `topic, service, region, reason, priority ("hoch"\|"mittel"\|"niedrig"), source` |
| `references/<id>` | `title, region, client?, clientApproved: bool, services: [string], year, facts: [string], files: [string], summary, feedback?, source` |
| `briefings/<JJJJ-MM-TT>` | `date, summary, items: [{module, severity ("info"\|"warnung"\|"kritisch"), text}], weekPlan?: [{day, task, module}], generatedBy ("copilot"\|"dashboard"), createdAt` |
| `meta/sync` | `{ content: {at, source}, leads: {…}, tenders: {…}, events: {…}, seo: {…}, references: {…} }` |
| `settings/general` | `staleDraftDays: 14, followupDays: 5, tenderRedDays: 3, tenderYellowDays: 7, regions: [string]` |

Schwellen (aus `settings/general`, Standardwerte oben)
* Content „hängt“: Status `entwurf` und `statusSince` älter als `staleDraftDays`.
* Lead-Follow-up fällig: Stage nicht gewonnen/verloren und `lastContact` älter als `followupDays`.
* Fristen-Ampel Ausschreibung: rot ≤ `tenderRedDays`, gelb ≤ `tenderYellowDays`, sonst grün.
