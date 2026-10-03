# Datenmodell – Artefakt-Speicher (`db`) des Marketing Cockpits

Einzige Datenquelle des Dashboards. Der Feind Copilot und die Skills schreiben hier
(in Claude Code / Cowork über das Werkzeug `ArtifactData`, Aktionen `set`, `update`,
`batch`, `list`, `query`), das Dashboard liest live (`onSnapshot`).
Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`

## Aufgaben InfraTech 2027: Notion ist führend (Entscheidung David, 01.10.2026)

* Einzige führende Aufgabenliste ist die Notion-Datenbank „Aufgaben InfraTech 2027“
  (https://app.notion.com/p/5718273f9a2c4ba085d5da4e62c0c878, Data Source
  `b640ffee-6dfd-4324-b3d6-4b1f2fec0153`). Aufgaben, Status und erledigte Punkte werden dort
  gepflegt; alles andere wird daraus abgeleitet. Zuständigkeit nur als Rolle (`Zuständig (Rolle)`);
  `Person (intern)` liest das Cockpit nie.
* Das Cockpit liest Notion live (je Minute) und schreibt Status, Notiz, Fällig, Priorität,
  Beschluss und Archiviert zurück (Notion gewinnt je Feld; vor dem Schreiben wird neu gelesen,
  inzwischen geänderte Felder nur nach Rückfrage). Der PDF-Rücklauf darf zusätzlich
  `Zuständig (Rolle)` setzen.
* Reihenfolge der Quellen im Cockpit: Notion live → Notion-Stand `notion/tasks` → eingebaute
  Liste im HTML (nur Notfallstand vom 28.09.2026, sichtbar als „Notfallstand, nicht aktuell“ gekennzeichnet,
  nie mit Notion-Daten gemischt, nicht beschreibbar).
* Die Event-Checkliste der InfraTech 2027 (`events/infratech-2027`) wird aus den Notion-Aufgaben
  abgeleitet (Fortschritt je Bereich). Abhaken dort schreibt nach Rückfrage die Notion-Aufgabe;
  `events/infratech-2027.checklist` wird nicht mehr geschrieben und bleibt nur Archiv/Rückfall,
  bis `checklistMigrated` gesetzt ist.
* ClickUp-Liste „[ARCHIV] Messe Rotterdam 2027 – InfraTech“ ist stillgelegt (nur Link auf Notion);
  dort keine neuen Aufgaben anlegen. Abgleich vom 01.10.2026: `konzepte/aufgaben-abgleich-2026-10-01.md`.

Grundregeln
* Datum immer `JJJJ-MM-TT`, Zeitstempel ISO 8601. IDs: kleinbuchstaben-mit-bindestrich.
* **Keine personenbezogenen Daten**: keine Namen, E-Mail-Adressen oder Telefonnummern
  von Ansprechpartnern. Firmen/Behörden als Organisation ja, Personen nein.
* **Keine Preise/Kalkulationen** (nur optional `valueBand`: "<10k" | "10-50k" | "50-150k" | ">150k").
  Ausnahme: interne Messeausgaben als Summen je Kostenblock in `budget/actuals` (Skill messe-budget).
  Umsatzdaten sind nicht Teil des Cockpits.
* Jeder Datensatz trägt `source` (Datei, Connector oder "manuell: David") – Output-Regel 5.
* Kundennamen in `references` nur mit `clientApproved: true` anzeigen.

| Pfad | Felder |
|---|---|
| `content/<id>` | `title, channel ("linkedin"\|"website"\|"newsletter"\|"referenzbericht"), status ("idee"\|"entwurf"\|"review"\|"freigegeben"\|"veroeffentlicht"), region, projectType, plannedDate, publishedDate?, statusSince, source, note?` |
| `mkt_leads/<id>` | `organisation, orgType ("bauunternehmen"\|"kommune"\|"behoerde"\|"ingenieurbuero"\|"sonstige"), stage ("neu"\|"qualifiziert"\|"angebot"\|"verhandlung"\|"gewonnen"\|"verloren"), channel ("website"\|"linkedin"\|"empfehlung"\|"ausschreibung"\|"messe"\|"telefon"), region, landkreis, service, valueBand?, createdAt, lastContact, nextAction, nextActionDate, source` |
| `leads/counts` | Nur Stückzahlen des InfraTech-Lead-Zählers: `{ days: { "JJJJ-MM-TT": {a, b, c} }, updatedAt }`. Marketing-Leads gehören nicht unter `leads/`. |
| `tenders/<id>` | `title, authority, cpv: [string], region, deadline, portal, url, fit ("passt"\|"pruefen"\|"passt_nicht"), fitReason, status ("neu"\|"in_pruefung"\|"angebot"\|"abgegeben"\|"verworfen"), statusNote?, foundAt, source` |
| `events/<id>` | `title, type ("messe"\|"tag_der_offenen_tuer"\|"baustellenbesichtigung"\|"sonstiges"), date, endDate?, location, checklist: [{area ("sicherheit"\|"ansprechpartner"\|"materialien"\|"verkehrssicherung"\|"logistik"\|"budget"\|"marketing"\|"nachbereitung"), item, done: bool}], nextStep?, leadsCaptured: number, followupStatus ("offen"\|"laeuft"\|"erledigt"), checklistMigrated?: {at, by (Nutzer-ID), to: "notion"}, source`. Für `infratech-2027` ist `checklist` nur Archiv; die Checkliste kommt aus Notion (siehe oben). |
| `tasks/<id>` | Zwischenstand der InfraTech-Aufgaben im Cockpit: `links: [{label, url}]`, `attachments: [{id, name, type}]`, bei im Cockpit neu angelegten Aufgaben die Aufgabenfelder mit `custom: true, notionPending` bis zur Übertragung nach Notion. Fachliche Felder führt Notion. |
| `notion/tasks` | Letzter Notion-Stand der Aufgaben für Ansichten ohne Notion-Zugang: `{ at, tasks: [{id, title, status, prio, due, note, beschluss, budget, archived, flags, cat, owner (Rollen-Schlüssel), deps?, nr, source, _nurl}] }`. Schreibt nur das Cockpit (bei Änderung, höchstens alle 5 Minuten). |
| `seo_keywords/<id>` | `keyword, region, position, previousPosition?, url, clicks, impressions, checkedAt, source` |
| `seo_traffic/<JJJJ-MM>` | `month, clicks, impressions, ctr, avgPosition, sessions?, source` |
| `seo_gaps/<id>` | `topic, service, region, reason, priority ("hoch"\|"mittel"\|"niedrig"), source` |
| `references/<id>` | `title, region, client?, clientApproved: bool, services: [string], year, facts: [string], files: [string], summary, feedback?, source`; für die Referenzkarte zusätzlich `place?, lat?, lng?` (WGS84, 3 Nachkommastellen), `geo?: {kind: "punkt"\|"strecke", to?: {lat, lng}}`, `date?` (`JJJJ-MM` oder `JJJJ-MM-TT`), `projectUrl?` (nur `https://`, Referenzseite auf fraesdienst-feind.de) |
| `knowledge/<id>` | Wissensbibliothek (Skill `wissensbibliothek`, Eingang Dropbox `/Marketing/KI-Agent/Datenbank-UPLOADs`): `title, category ("knowledge"\|"projects"\|"templates"\|"reference"\|"_archive"\|"_failed"), topic, docType, summary (max. 600 Zeichen, ohne Personendaten), tags: [string], status ("einsortiert"\|"duplikat"\|"fehlgeschlagen"), reason?, duplicateOf?, confidentiality ("oeffentlich"\|"intern"\|"vertraulich"), dropboxPath, fromPath, originalName, sizeBytes, contentHash?, processedAt, source` |
| `briefings/<JJJJ-MM-TT>` | `date, summary, items: [{module, severity ("info"\|"warnung"\|"kritisch"), text}], weekPlan?: [{day, task, module}], generatedBy ("copilot"\|"dashboard"), createdAt` |
| `budget/actuals` | `{ blocks: { <Schlüssel>: { ist?: number, forecast?: number } }, updatedAt }` – Euro brutto, ganze Zahlen; Schlüssel: `messestand-standbau`, `technik-strom-tv-parken-muell`, `logistik-spedition`, `hotel-aufbaupersonal`, `catering-geschirr`, `werbemittel-print`, `reserve` |
| `meta/sync` | `{ content: {at, source}, leads: {…}, tenders: {…}, events: {…}, seo: {…}, references: {…}, budget: {…}, knowledge: {at, source, processed, failed, duplicates, inbox} }` (Schlüssel `leads` bezeichnet den Bereich, die Daten liegen in `mkt_leads`) |
| `settings/general` | `staleDraftDays: 14, followupDays: 5, tenderRedDays: 3, tenderYellowDays: 7, regions: [string]` |

Schwellen (aus `settings/general`, Standardwerte oben)
* Content „hängt“: Status `entwurf` und `statusSince` älter als `staleDraftDays`.
* Lead-Follow-up fällig: Stage nicht gewonnen/verloren und `lastContact` älter als `followupDays`.
* Fristen-Ampel Ausschreibung: rot ≤ `tenderRedDays`, gelb ≤ `tenderYellowDays`, sonst grün.
