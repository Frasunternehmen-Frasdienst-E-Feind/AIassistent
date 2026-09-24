---
name: dashboard-builder
description: Aktualisiert und veröffentlicht das Marketing-Cockpit-Dashboard (dashboard/dashboard.html als Claude-Artefakt mit db und sample) und spiegelt die lokalen Ordner Marketing/Content/, Marketing/Events/ und Referenzen/ in den Artefakt-Speicher. Greift bei „Dashboard aktualisieren“, „Cockpit neu veröffentlichen“, „Daten synchronisieren“, „Sync fahren“, „Dashboard einrichten“, „Ersteinrichtung“, „Layout/Farben im Cockpit ändern“ oder wenn ein anderer Skill Daten geschrieben hat und meta/sync gepflegt werden muss.
---

# Dashboard-Builder – Marketing Cockpit

## Zweck

Du hältst das Marketing Cockpit von David (Marketing & Eventmanager, Fräsdienst-Service
E. Feind GmbH) aktuell. Das Dashboard ist eine reine Anzeige: Die Seite
`dashboard/dashboard.html` im Plugin liest alle Daten live aus dem Artefakt-Speicher (`db`).
Du veröffentlichst die Seite, richtest den Speicher ein und synchronisierst die lokalen
Arbeitsordner hinein. Verbindliches Datenmodell: `kontext/datenmodell.md` – Pfade und
Feldnamen exakt übernehmen, keine eigenen Felder erfinden.

Dashboard-URL: `{{DASHBOARD_URL}}`

## Grundregeln

1. Schreibe **niemals Daten ins HTML**. Keine Leads, Beiträge, Ausschreibungen, Keywords
   oder Referenzen als Konstanten im Markup oder Skript. Daten gehören ausschließlich in `db`.
   Eine HTML-Änderung ist nur für Layout, Darstellung oder Logik nötig.
2. Unternehmensfakten (Leistungen, Maschinen, Standorte, Kennzahlen) nur aus
   `kontext/unternehmen.md` übernehmen. Die Datei wird parallel von einem Kollegen erstellt;
   fehlt sie oder fehlt ein Wert, frage David, statt zu raten.
3. Keine personenbezogenen Daten (Namen, E-Mail, Telefon von Ansprechpartnern), keine Preise
   oder Kalkulationen – höchstens `valueBand`.
4. Jeder Datensatz trägt `source` (Dateipfad, Connector oder `"manuell: David"`).
5. Bei rechtlichen oder vertraglichen Fragen: „Bitte Rechtsabteilung prüfen.“

## Eingaben und Datenquellen

| Quelle | Ziel in `db` | Zuständiger Skill für die Detailregeln |
|---|---|---|
| `Marketing/Content/` (Markdown, DOCX) | `content/<id>` | content-pipeline |
| `Marketing/Events/` | `events/<id>` | event-planning |
| `Referenzen/` (PDF, Bilder, Excel) | `references/<id>` | reference-library |
| CRM-Export / Connector | `leads/<id>` | lead-tracking |
| Vergabeportale | `tenders/<id>` | tender-monitoring |
| `seo-report` JSON (`output/*.json`) | `seo_keywords`, `seo_traffic`, `seo_gaps` | seo-local |
| CI-Vorgaben | nur Darstellung | `branding/feind-ci.tokens.json` im Repository |

Die Ordner `Marketing/…` und `Referenzen/` liegen im verbundenen Arbeitsordner von David.
Findest du einen Ordner nicht, frage nach dem Pfad, statt einen anzulegen.

## Arbeitsablauf A – Ersteinrichtung

1. Lade vor dem ersten Schreiben der Seite die Skills `artifact-design` und
   `artifact-capabilities`.
2. Prüfe, ob `dashboard/dashboard.html` existiert und lies sie vollständig.
3. Veröffentliche die Seite mit `Artifact` (action `publish`), `file_path` auf
   `dashboard/dashboard.html`, `icon: "chart"` und `capabilities` mit `db` und `sample`.
   Notiere die zurückgegebene URL und bitte David, sie in der Plugin-Konfiguration als
   `{{DASHBOARD_URL}}` einzutragen.
4. Lege die Einstellungen an (nur wenn noch nicht vorhanden – vorher per `list` auf die
   Sammlung `settings` prüfen):
   `ArtifactData set` auf `{{DASHBOARD_URL}}`, collection `settings`, doc_id `general`:
   ```json
   { "staleDraftDays": 14, "followupDays": 5, "tenderRedDays": 3,
     "tenderYellowDays": 7, "regions": [] }
   ```
   Die Liste `regions` füllst du nur mit Regionen, die David nennt oder die in
   `kontext/unternehmen.md` stehen.
5. Lege `meta/sync` leer an (`set`, alle Module mit `{ "at": null, "source": null }`).
6. Führe danach Ablauf B einmal vollständig aus.

## Arbeitsablauf B – Synchronisation der lokalen Ordner

1. Lies `settings/general` (`ArtifactData get` oder `list` auf `settings`).
2. Lies je Modul den aktuellen Stand: `ArtifactData list` auf `content`, `events`,
   `references`. Merke dir die vorhandenen IDs und `source`-Pfade.
3. Lies die Dateien in `Marketing/Content/`, `Marketing/Events/`, `Referenzen/` ein und
   bilde jeden Eintrag nach den Regeln des zuständigen Skills auf das Datenmodell ab.
   ID: kleinbuchstaben-mit-bindestrich, stabil aus dem Dateinamen abgeleitet, damit ein
   erneuter Sync denselben Datensatz trifft.
4. Vergleiche: neu (nicht in `db`), geändert (Felder weichen ab), verwaist (in `db`, Datei
   fehlt). Verwaiste Datensätze löschst du nicht selbstständig – liste sie David auf.
5. Schreibe Neues und Geändertes gesammelt mit **einem** `ArtifactData batch` je Modul
   (`set` für neue Dokumente, `update` für geänderte Felder).
6. Pflege danach `meta/sync` mit `ArtifactData update`, collection `meta`, doc_id `sync`,
   nur für die tatsächlich synchronisierten Module, z. B.:
   ```json
   { "content": { "at": "2026-09-24T10:15:00+02:00", "source": "Marketing/Content/" },
     "events": { "at": "2026-09-24T10:15:00+02:00", "source": "Marketing/Events/" } }
   ```
   Diese Pflicht gilt nach **jedem** Sync, auch wenn ein anderer Skill geschrieben hat.
7. Melde David das Ergebnis im Ausgabeformat unten.

## Arbeitsablauf C – Dashboard ändern und neu veröffentlichen

1. Lies die veröffentlichte Fassung mit `Artifact` (action `read`, `url` = `{{DASHBOARD_URL}}`)
   und gleiche sie mit `dashboard/dashboard.html` ab. Weicht die veröffentlichte Fassung ab,
   übernimm deren Änderungen, bevor du eigene machst.
2. Lade `artifact-design` (und bei Datenzugriffen `artifact-capabilities`), bevor du das
   HTML änderst. Bei Diagrammen zusätzlich `dataviz`.
3. Ändere nur Darstellung und Logik. Datenzugriffe laufen über die `db`-Laufzeit
   (live lesen, `onSnapshot`); die Capability `sample` dient nur für Beispieldaten in der
   Vorschau, wenn `db` leer ist – Beispieldaten nie als echte Werte ausgeben.
4. Veröffentliche mit `Artifact` publish, `url` = `{{DASHBOARD_URL}}`, gleiches
   `file_path`. Beim Redeploy kein `icon` und kein `capabilities` angeben, damit beides
   erhalten bleibt.

## CI-Regeln (verbindlich)

Quelle ist allein `branding/feind-ci.tokens.json`. Übernimm die Werte als CSS-Variablen auf
`:root`; setze keine Farbwerte hart im Markup.

* Grün `#84bb20` nur als Fläche oder Akzent. Auf Grün steht Anthrazit `#424e4e`, nie Weiß.
* Grün nie als Textfarbe auf hellem Grund (2,3:1) – dort `accent-text` `#5e8a14`.
* Rot `#e3000b` nur als Signal (Frist rot, Follow-up überfällig, kritische Briefing-Punkte,
  Minus). Auf dunklem Grund Rot nur als Fläche oder Linie, Text dort `signal-text`.
* Schrift: Display `Exo`, Fließtext `Helvetica Neue / Helvetica / Arial`.
* Radien nahe 0 (Eingaben 2 px, Buttons 4 px), Abstände aus 4 / 8 / 16 / 24 / 40 / 64.
* Beide Themes: hell auf `:root`, dunkel über `@media (prefers-color-scheme: dark)` mit
  `:root:not([data-theme="light"])` und zusätzlich über `:root[data-theme="dark"]`.
* Mobil nutzbar (16 px Seitenrand, kein horizontales Scrollen).

## Qualitäts- und Compliance-Checks vor jedem Schreiben

* Stimmen Pfade und Feldnamen exakt mit `kontext/datenmodell.md` überein? Enum-Werte
  kleingeschrieben und ohne Umlaute (`veroeffentlicht`, `tag_der_offenen_tuer`)?
* Datum `JJJJ-MM-TT`, Zeitstempel ISO 8601?
* Hat jeder Datensatz `source`?
* Keine Personennamen, E-Mail-Adressen, Telefonnummern, keine Preise im Datensatz?
* `references`: `client` nur befüllt, wenn `clientApproved: true` belegt ist.
* Keine Daten im HTML? Suche vor dem Veröffentlichen nach eingebetteten Datensätzen.
* Kontrastregeln der Tokens eingehalten, beide Themes geprüft?

## Ausgabeformat an David

```
Sync <Datum Uhrzeit>
- content: 3 neu, 1 geändert, 0 verwaist (Quelle: Marketing/Content/)
- events: 0 neu, 2 geändert (Quelle: Marketing/Events/)
- references: 1 neu; 1 verwaist -> bitte entscheiden: <id>
Offene Fragen: <Liste>
Dashboard: {{DASHBOARD_URL}}
```

Nenne bei jeder Zahl die Quelle. Fehlende Felder listest du als offene Fragen, statt sie
zu füllen.

## Grenzen

* Kein Löschen von Datensätzen ohne ausdrückliche Zustimmung von David.
* Keine Veröffentlichung einer neuen Artefakt-URL, wenn `{{DASHBOARD_URL}}` schon existiert.
* Keine Zugangsdaten in HTML, `db` oder versionierte Dateien.
* Inhalte von Dritten (Namen, Kontakte) werden nicht übernommen, auch wenn sie in den
  Quelldateien stehen.
* Fachliche Bewertungen (Lead-Stage, Ausschreibungs-Eignung, Freigaben) trifft der
  jeweilige Fach-Skill, nicht dieser Skill.
