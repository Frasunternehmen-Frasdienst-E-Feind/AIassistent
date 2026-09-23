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
- **Aufgaben direkt im Cockpit anlegen/bearbeiten** (Modal: Titel, Bereich, Owner, Prio, Termin, Notiz); Speicherung in `db`-Sammlung `tasks/<id>`, überlagert den eingebetteten Seed; eigene Aufgaben als „eigene" markiert.
- **Archivieren statt Löschen**: Aufgaben werden ausgeblendet, bleiben aber in der DB erhalten und sind über „Archiv anzeigen" → „Wiederherstellen" zurückholbar (kein Hard-Delete, auch für eigene Aufgaben). Alt-Tombstones aus dem früheren „Löschen" erscheinen im Archiv und lassen sich wiederherstellen.
- **Team & Zugriff**-Tab: Mitglieder anlegen/entfernen (Name, Rolle); Mitglieder erscheinen als Owner und im Owner-Filter; Hinweis, wie man das Team später per Share-Menü zum Cockpit einlädt. Speicherung in `settings/general`.
- **Termin-Erinnerungen**: konfigurierbare Vorlaufzeiten (Tage) + Dashboard-Panel „Anstehende Erinnerungen"; Push/E-Mail-Zustellung über den wöchentlichen Manager-Agenten.
- **„Meine Aufgaben" / Owner-Ansicht**: 1-Klick-Chips je Teammitglied (statt Dropdown), inkl. hervorgehobenem „★ Meine Aufgaben (David)".
- **Abhängigkeiten / Blocker** zwischen Aufgaben: im Editor „Blockiert durch" (Mehrfachauswahl, nach Bereich gruppiert), Speicherung als `deps` in `tasks/<id>`. Offene Blocker zeigen an der Aufgabe eine Pille „⛔ wartet auf n" (Tooltip nennt die Titel); erledigte/archivierte Blocker lösen die Blockade auf.
- **Fristen-Export ICS & CSV** (Fristen-Tab): ICS-Kalenderdatei (RFC 5545, ganztägige Termine, Zeilenfaltung) zum Import/Abo in Outlook/Google/Apple Kalender; CSV (UTF-8-BOM, Semikolon, DE-Datum) für Excel.
- **Aufgaben-Export CSV & Markdown** (Aufgaben-Tab): exportiert die aktuell gefilterte Ansicht (Bereich/Prio/Owner/Suche, aktiv oder Archiv). CSV (UTF-8-BOM, Semikolon) mit Bereich, Titel, Prio, Owner, Termin, Status, Blockern, Notiz; Markdown als Checklisten je Bereich (`- [ ] (Prio · Owner · Termin) Titel`, inkl. Blocker/Notiz). Download über die `downloads`-Capability (`.csv`/`.md`).
- **Budget-Ist-Erfassung** (Budget-Tab): je Kostenblock editierbare Felder Forecast (mit Planrahmen-Mittelwert vorbelegt) und Ist; Abweichungs-Ampel grün (≤ Plan) / gelb (bis +10 %) / rot (> +10 %), inkl. Gesamtzeile. Speicherung in `db`-Sammlung `budget/actuals` (geteilt), lokaler Fallback.
- **Lead-Zähler live** (Tab „Lead-Zähler"): Tageszählung 12.–15.01.2027 je Qualität A/B/C mit +/–-Buttons, Tages- und Gesamtsummen, Zielerreichung ≥ 300; heutiger Tag hervorgehoben; CSV-Export. **Nur Stückzahlen, keine personenbezogenen Daten.** Speicherung in `db`-Sammlung `leads/counts` (geteilt), lokaler Fallback.
- **Aktivitätsprotokoll** (Tab „Protokoll"): erfasst „wer hat wann was geändert" (Status, Aufgabe anlegen/bearbeiten/archivieren/wiederherstellen, Budget, Team) mit Zeitstempel; neueste zuerst, CSV-Export. Nutzt die `user`-Capability – gespeichert werden nur opake Team-IDs (`activity/<id>`), Namen werden zur Anzeige aufgelöst (Scope `profile`). Ohne geteilte DB kein Log.

## Backlog (Vorschläge, priorisiert)

### P2 – Komfort
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
