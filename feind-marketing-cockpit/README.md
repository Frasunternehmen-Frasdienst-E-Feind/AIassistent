# Feind Marketing Cockpit

Zentrales Marketing-Dashboard mit KI-Assistenz für die Fräsdienst-Service E. Feind GmbH.
Plugin für Cowork bzw. Claude Code, Version 1.0.0.

> **How to use**
> 1. Morgens `/tagesbrief` – zeigt, was heute wichtig ist.
> 2. Vor jeder Veröffentlichung `/compliance-check <Datei oder Text>`.
> 3. Nach neuen Dateien oder Leads `/cockpit-sync` – das Dashboard zeigt den Stand.

## Was ist drin

```
feind-marketing-cockpit/
├── .claude-plugin/plugin.json      Plugin-Beschreibung
├── .mcp.json                       leer; Connectors werden in der App verbunden
├── CLAUDE.md                       Regeln für alle Ausgaben (Ton, Quellen, Datenschutz, CI)
├── README.md                       diese Anleitung
├── connectors.md                   welche Dienste verbunden sind und welche fehlen
├── geplante-aufgaben.md            fertige Prompts für geplante Aufgaben
├── agents/feind-copilot.md         persönlicher Assistent (Tagesbrief, Planung, Kontrolle)
├── commands/                       Slash-Commands
│   ├── tagesbrief.md               /tagesbrief
│   ├── wochenplan.md               /wochenplan
│   ├── lead-report.md              /lead-report
│   ├── content-performance.md      /content-performance
│   ├── compliance-check.md         /compliance-check
│   └── cockpit-sync.md             /cockpit-sync
├── skills/                         7 Fach-Skills
│   ├── dashboard-builder/  content-pipeline/  lead-tracking/  tender-monitoring/
│   └── event-planning/  seo-local/  reference-library/
├── dashboard/dashboard.html        das Cockpit (Artefakt mit Datenspeicher)
├── kontext/
│   ├── datenmodell.md              Aufbau der Daten im Cockpit
│   └── unternehmen.md              Unternehmensprofil mit Status je Fakt, Glossar
└── vorlagen/                       Event-Checklisten, Follow-up-E-Mail, LinkedIn-Post,
                                    Referenzbericht, Frontmatter für Content-Dateien
```

## Installation

Laut Davids Angabe (Weg in der aktuellen Cowork-Version bitte prüfen):

* **Variante A:** Den Ordner `feind-marketing-cockpit` als ZIP packen (aus dem
  Repo-Ordner: `sh feind-marketing-cockpit/build-zip.sh`) und in Cowork als Plugin hochladen.
* **Variante B:** Den Ordner nach `mnt/.local-plugins/feind-marketing-cockpit/` legen.

Danach Cowork neu laden. Prüfen: Die Commands `/tagesbrief` usw. erscheinen, und
„feind-copilot“ ist als Agent verfügbar.

## Ersteinrichtung

1. **Dashboard öffnen:** Skill `dashboard-builder` veröffentlicht das Cockpit
   (`dashboard/dashboard.html`) als Artefakt. Die URL ersetzt den Platzhalter
   `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd` in allen Dateien des Plugins (Agent, Commands,
   `kontext/datenmodell.md`, `geplante-aufgaben.md`).
2. **`/cockpit-sync`** ausführen: legt `settings/general` mit Standardwerten an und
   übernimmt vorhandene Dateien aus `Marketing/…` und `Referenzen/`. Vor dem
   Schreiben zeigt Claude eine Übersicht zur Bestätigung.
3. **Connectors prüfen:** `connectors.md` durchgehen. Verbunden sind Gmail, Google
   Calendar, Google Drive, Dropbox, Notion, ClickUp, Firecrawl, Parallel Search,
   Canva, DeepL. CRM, SharePoint/Nextcloud, LinkedIn, Outlook, Search Console/GA4
   fehlen noch.
4. **Unternehmensprofil klären:** Widersprüche in `kontext/unternehmen.md`
   (Maschinenzahl, Einsatzgebiet, Lage Wittenburg, Leistungen) mit Vertrieb bzw.
   Geschäftsführung klären und Status aktualisieren.
5. **Geplante Aufgaben** aus `geplante-aufgaben.md` in Cowork anlegen.

## Tägliche Nutzung

| Wann | Was |
|---|---|
| Morgens | `/tagesbrief` (oder automatisch 07:00) – Kennzahlen und Warnungen im Dashboard |
| Montags | `/wochenplan` – Vorschlag für Montag bis Freitag |
| Nach Gesprächen, Messen, Mails | Lead im Cockpit erfassen lassen („Neuer Lead: …“), dann `/cockpit-sync leads` |
| Vor jedem Post, Bericht, Flyer | `/compliance-check` |
| Neues Event | „Lege Checkliste für die Messe … an“ – nutzt `vorlagen/` |
| Freitags | `/content-performance` |
| Sonntags | `/lead-report` (oder automatisch 18:00) |

Claude veröffentlicht und versendet nie selbst. E-Mails entstehen als Entwurf, Posts
als Vorschlag, Dateien werden erst nach Bestätigung verschoben.

## Offene Fragen

1. Welche Dashboard-URL gilt (Ersatz für `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`)?
2. Welches CRM nutzt der Vertrieb, und soll es angebunden werden?
3. Wo liegt die Unternehmensablage (Google Drive, Dropbox, SharePoint, Nextcloud)?
4. Firmen-E-Mail und Kalender: Google oder Microsoft 365/Outlook?
5. Maschinenpark: rund 40 Fräsen oder über 30 Wirtgen-Fräsmaschinen?
6. Einsatzgebiet: Schwerpunktregionen Ost-/Norddeutschland oder deutschlandweit?
7. Gehören Grinding & Grooving, Pflasterschleifen, Baugrundsanierung und
   Verkehrssicherung zum aktuellen Leistungsangebot?
8. Wer erteilt Freigaben für Kundennamen und Veröffentlichungen (Rolle Vertrieb oder GF)?

## Erfolgsmessung

Ausgangswerte in der ersten Woche erfassen, dann monatlich vergleichen.

| Kennzahl | Messung | Quelle |
|---|---|---|
| Zeit pro LinkedIn-Post | Minuten von Idee bis Freigabe, von David notiert | manuell: David |
| Qualifizierte Leads pro Monat | Leads mit Stage ab `qualifiziert` | `leads/*` |
| Geprüfte Ausschreibungen pro Woche | `tenders/*` mit `foundAt` in der Woche und Fit-Bewertung | `tenders/*` |
| Reaktionszeit auf Leads | Tage zwischen `createdAt` und erstem Kontakt; Ziel unter `followupDays` | `leads/*` |
| Feedback nach 1 Woche | Kurze Rückmeldung von David: Was hilft, was stört, was fehlt | manuell: David |
