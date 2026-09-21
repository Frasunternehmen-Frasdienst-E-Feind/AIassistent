# Funktions-Backlog – InfraTech 2027 Cockpit

Backlog für die **funktionale Weiterentwicklung** des Cockpits
(`infratech-2027-liste.html`, Artefakt https://claude.ai/artifact/4zX58mseXB9vbspN8xAzJ2).
Grundlage für die verknüpfte Claude-Code-Session und den Manager-Agenten.

## Bereits umgesetzt (v1)
- Konsolidierte, kategorisierte Aufgabenliste (12 Bereiche) mit Owner, Priorität, Termin.
- Dashboard mit Ampel je Bereich, Fortschrittsring, Countdown, Warnungen.
- Tabs Fristen, Budget, Ziele/KPIs, Lessons Learned, Faktencheck, Wissensbasis.
- Statuspflege (offen/in Arbeit/blockiert/erledigt) mit geteilter DB + localStorage-Fallback.
- Filter (Bereich, Priorität, Suche), Notizen je Aufgabe, JSON-Export in Zwischenablage.
- Corporate Design (feind-ci.tokens.json), Hell/Dunkel, mobil.

## Backlog (Vorschläge, priorisiert)

### P1 – hoher Nutzen
1. **Aufgaben im Cockpit anlegen/bearbeiten** (Titel, Bereich, Owner, Prio, Termin) statt nur im Code – Speicherung in `db` (Sammlung `tasks`), Seed-Migration aus dem eingebetteten Datensatz.
2. **Termin-Erinnerungen**: Push/E-Mail über den Manager-Agenten, X Tage vor Fälligkeit (siehe Agent-Charter).
3. **Owner-Ansicht / „Meine Aufgaben"** mit Filter je Teammitglied.
4. **Verantwortlichkeiten & Abhängigkeiten** zwischen Aufgaben (z. B. „Fläche entschieden" blockiert „Layout").

### P2 – Komfort
5. **ICS-Export** der Fristen (Kalender-Abo) und **CSV/Markdown-Export** der Aufgaben.
6. **Budget-Ist-Erfassung** je Kostenblock (Forecast vs. Ist, Ampel bei >10 %).
7. **Lead-Zähler live** während der Messe (Tageszählung, ohne personenbezogene Daten).
8. **Aktivitätsprotokoll** (wer hat wann welchen Status geändert) via `user`-Capability.
9. **Anhänge/Links** je Aufgabe (Angebote, Freigaben) über `assets`-Capability.

### P3 – Ausbau
10. **Mehrsprachige Giveaway-Sprüche DE/EN/NL** direkt im Marketing-Tab.
11. **Wochenreport** automatisch als kurze Statusmail an Stakeholder.
12. **Anbindung an Zeitplan/Meilensteine** (Gantt-Mini-Ansicht T-12M … T+14d).

## Technische Hinweise für die Weiterentwicklung
- Aufgaben-Definitionen liegen aktuell im HTML (`const TASKS`). Beim Umzug in `db` die IDs
  stabil halten (bestehende `overrides/<id>` referenzieren diese IDs).
- `db`-Sammlung `overrides/<taskId>` = `{ id, status, note, updatedAt }`; geplante Sammlung
  `tasks/<taskId>` = `{ title, cat, prio, owner, due, note, flags }`.
- Corporate Design ausschließlich aus `branding/feind-ci.tokens.json`; keine harten Farbwerte.
- Datenschutz: keine personenbezogenen Daten Dritter im Cockpit oder in der DB.
