---
description: Marketing Cockpit mit Dateien und verbundenen Quellen abgleichen und meta/sync aktualisieren
argument-hint: "[Bereich: alle | content | leads | tenders | events | seo | references]"
---

Gleiche das Marketing Cockpit `{{DASHBOARD_URL}}` für den Bereich $ARGUMENTS ab
(ohne Angabe: alle). Koordination durch den Subagenten `feind-copilot`, Ausführung
durch den zuständigen Skill:

| Bereich | Skill | Quellen |
|---|---|---|
| content | `content-pipeline` | `Marketing/Content/` (Frontmatter nach `vorlagen/content-frontmatter.md`), Notion/ClickUp falls genutzt |
| leads | `lead-tracking` | `Marketing/Leads/`, Gmail (nur lesen); kein CRM verbunden |
| tenders | `tender-monitoring` | `Marketing/Ausschreibungen/`, Vergabeplattformen über Firecrawl/Parallel Search |
| events | `event-planning` | `Marketing/Events/`, Google Calendar |
| seo | `seo-local` | Exporte von David; Search Console/GA4 nicht verbunden |
| references | `reference-library` | `Referenzen/` |

Regeln:
1. Vor dem Schreiben eine Übersicht zeigen: neu / geändert / unverändert je Bereich.
   Schreiben per `ArtifactData` `batch` erst nach Bestätigung durch David.
2. Keine personenbezogenen Daten, keine Preise; jeder Datensatz mit `source`.
3. Danach `meta/sync.<bereich>` mit `{at, source}` setzen.
4. Ist `settings/general` leer, Standardwerte aus `kontext/datenmodell.md` anlegen.
5. Konflikte (gleiche ID, abweichende Werte) nicht auflösen, sondern auflisten.
