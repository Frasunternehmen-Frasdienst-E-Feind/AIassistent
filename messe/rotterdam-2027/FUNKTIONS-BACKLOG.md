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

## Bereits umgesetzt (v2)
- **Aufgaben direkt im Cockpit anlegen/bearbeiten/löschen** (Modal: Titel, Bereich, Owner, Prio, Termin, Notiz); Speicherung in `db`-Sammlung `tasks/<id>`, überlagert den eingebetteten Seed; eigene Aufgaben als „eigene" markiert.
- **Team & Zugriff**-Tab: Mitglieder anlegen/entfernen (Name, Rolle); Mitglieder erscheinen als Owner und im Owner-Filter; Hinweis, wie man das Team später per Share-Menü zum Cockpit einlädt. Speicherung in `settings/general`.
- **Termin-Erinnerungen**: konfigurierbare Vorlaufzeiten (Tage) + Dashboard-Panel „Anstehende Erinnerungen"; Push/E-Mail-Zustellung über den wöchentlichen Manager-Agenten.
- **Owner-Filter** in der Aufgabenansicht.

## Backlog (Vorschläge, priorisiert)

### P1 – hoher Nutzen
1. **Verantwortlichkeiten & Abhängigkeiten** zwischen Aufgaben (z. B. „Fläche entschieden" blockiert „Layout").
2. **„Meine Aufgaben"-Schnellansicht** je Teammitglied (ein Klick statt Filter).

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
