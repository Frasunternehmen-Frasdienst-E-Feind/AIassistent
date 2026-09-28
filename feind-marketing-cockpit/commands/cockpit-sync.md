---
description: Marketing Cockpit mit Dateien und verbundenen Quellen abgleichen und meta/sync aktualisieren
argument-hint: "[Bereich: alle | content | leads | tenders | events | seo | references]"
---

Gleiche das Marketing Cockpit `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd` für den Bereich $ARGUMENTS ab
(ohne Angabe: alle). Koordination durch den Subagenten `feind-copilot`, Ausführung
durch den zuständigen Skill:

| Bereich | Skill | Quellen |
|---|---|---|
| content | `content-pipeline` | `02_Content & Kampagnen/` (Frontmatter nach `vorlagen/content-frontmatter.md`), Notion/ClickUp falls genutzt |
| leads | `lead-tracking` | `07_Leads/`, HubSpot (CRM, Connector noch nicht verbunden – bis dahin CSV-Export), Gmail (nur lesen) |
| tenders | `tender-monitoring` | `06_Reports & Analysen/Ausschreibungen/`, Vergabeplattformen über Firecrawl/Parallel Search |
| events | `event-planning` | `03_Events/`, Google Calendar |
| seo | `seo-local` | Exporte von David; Search Console/GA4 nicht verbunden |
| references | `reference-library` | `05_Referenzen/` |

Regeln:
1. Vor dem Schreiben eine Übersicht zeigen: neu / geändert / unverändert je Bereich.
   Schreiben per `ArtifactData` `batch` erst nach Bestätigung durch David.
2. Keine personenbezogenen Daten, keine Preise; jeder Datensatz mit `source`.
3. Danach `meta/sync.<bereich>` mit `{at, source}` setzen.
4. Ist `settings/general` leer, Standardwerte aus `kontext/datenmodell.md` anlegen.
5. Konflikte (gleiche ID, abweichende Werte) nicht auflösen, sondern auflisten.
