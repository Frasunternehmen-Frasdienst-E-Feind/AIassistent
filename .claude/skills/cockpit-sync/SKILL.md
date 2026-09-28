---
name: cockpit-sync
description: Synchronisiert Marketing-Daten (Content, Leads, Ausschreibungen, Events, SEO, Referenzen) in den Speicher des konsolidierten Feind Cockpits und aktualisiert meta/sync. Nutzen, wenn David „/cockpit-sync“, „Cockpit aktualisieren“ oder „Daten ins Cockpit“ sagt.
---

# /cockpit-sync – Feind Cockpit v1.0

Schreibt Datensätze aus den Marketing-Skills in den Artefakt-Speicher des **konsolidierten
Cockpits** (`cockpit/Feind-Cockpit.html`). Verbindliches Schema: `cockpit/docs/SCHEMA.md`.

## Ziel-Artefakt

- URL: **die in `cockpit/README.md` unter „Live-Artefakt“ eingetragene Adresse** (nach dem Go-Live).
  Ist dort noch keine eingetragen, frage David nach der Adresse und schreibe nichts.
- Werkzeug: `ArtifactData` (`list`/`get` zum Lesen, `batch` mit höchstens 50 Schreibvorgängen zum Schreiben).
  Jeden Schreibvorgang auf ein vorher gelesenes Dokument mit `if_version` absichern.

## Sammlungen (neu seit v1.0)

| Modul | Sammlung | Hinweis |
|---|---|---|
| Content | `content/<id>` | unverändert |
| Leads | **`mkt_leads/<id>`** | **umbenannt, vorher `leads`**. `leads/counts` gehört dem Messe-Lead-Zähler und wird **nie** angefasst |
| Ausschreibungen | `tenders/<id>` | Feld `bundesland` oder `distanceKm` für die Nähe-Sortierung mitgeben |
| Events | `events/<id>` | Die Messe hat die feste ID `events/infratech-2027` (Brücke zur InfraTech-Welt) |
| SEO | `seo_keywords/<id>`, `seo_traffic/<JJJJ-MM>`, `seo_gaps/<id>` | unverändert |
| Referenzen | `references/<id>` | Kundennamen nur mit `clientApproved: true` |
| Sync-Stand | `meta/sync` = `{ content:{at,source}, leads:{at,source}, … }` | nach jedem Lauf per `update` setzen |

**Nicht schreiben:** `tasks`, `settings/*`, `budget/*`, `leads/counts`, `acquisition/*`, `planning/*`,
`admin/*`, `activity`. Diese Pfade pflegen die Seite selbst, der Manager-Agent (InfraTech) bzw. die Admins.

## Ablauf

1. Ziel-URL prüfen (siehe oben). Ohne URL: nachfragen, abbrechen.
2. Je Modul die Quelldaten holen (Skill-Ausgabe, Export, Notion). **Keine personenbezogenen Daten
   Dritter:** Leads nur als Organisation, keine Namen, E-Mails oder Telefonnummern von Personen.
3. Bestand lesen (`ArtifactData list`), neue Dokumente per `set` und geänderte per `update` in Paketen ≤ 50 schreiben.
4. `meta/sync` mit `{ <modul>: { at: ISO-Zeitpunkt, source: "<Quelle>" } }` aktualisieren.
5. Ergebnis an David melden: je Modul neu/geändert/unverändert. Hinweise auf Konflikte, Rechtsthemen
   („Bitte Rechtsabteilung prüfen“) und fehlende Einwilligungen („Einwilligung erforderlich“) aufnehmen.

## Altbestand

Liefert eine ältere Skill-Version Leads nach `leads/<id>`, dann **nicht** direkt schreiben, sondern
`mkt_leads/<id>` verwenden. Bereits vorhandene Alt-Dokumente übernimmt die Migration
(Cockpit → Admin → Migration bzw. `node cockpit/tools/migrate.mjs`), ohne etwas zu löschen.
