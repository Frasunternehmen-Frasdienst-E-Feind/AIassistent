# Stempeluhr – Zeiterfassung

Weiterentwicklung der bisherigen Google-Tabelle „Zeiterfassung_David-Halko" als
eigenständige Web-App. Keine Installation, kein Build-Schritt, keine Server:
`index.html` im Browser öffnen, fertig. Die Daten bleiben im Browser (localStorage).

## Was die App kann

- **Stempeluhr**: Kommen · Pause · Weiter · Gehen mit Live-Uhr und Status.
- **Tagesübersicht**: Einstempelzeit, Ausstempelzeit, Pausen, Netto/Brutto,
  Kalenderwoche, Tages-Soll, Überstunden – das, was die Tabelle mit `#ERROR!` nicht mehr rechnete.
- **Buchungen**: alle Einzelbuchungen (Auftrag 000999 „Kommen" / 000007 „*Pause*"),
  bearbeiten, nachtragen, löschen, Monatsfilter.
- **Wochen**: Ist vs. Soll je Tag als Balken, Wochensumme, Überstunden.
- **Hinweise nach ArbZG**: Pause < 30 min bei > 6 h, < 45 min bei > 9 h, > 10 h/Tag,
  sowie nicht ausgestempelte Buchungen an vergangenen Tagen.
- **Import/Export**: CSV (Semikolon, Excel-tauglich) für Buchungen und Tage,
  JSON-Backup, Import aus CSV oder JSON (auch das Blatt „Buchungen" der Google-Tabelle).
- **Einstellungen**: Wochenstunden und Arbeitstage → Tages-Soll.

Beim ersten Start sind die Buchungen vom 17.08. bis 07.09.2026 aus der Google-Tabelle
vorgeladen (`seed-data.js`). Zwei Buchungen waren dort „offen" (20.08. ab 15:15, 07.09. ab 06:54)
und werden als „nicht ausgestempelt" markiert, bis eine Endzeit nachgetragen ist.

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Oberfläche und Styles |
| `app.js` | Bedienlogik, Speicherung, Import/Export |
| `zeit.js` | Reine Berechnungslogik (Browser und Node) |
| `seed-data.js` | Startdaten aus der Google-Tabelle |
| `test/zeit.test.js` | Unit-Tests (`npm test`) |

## Annahmen

- Tages-Soll = Wochenstunden ÷ Anzahl Arbeitstage (Standard 40 h / 5 Tage = 8:00 h).
- Soll wird nur für Tage mit Buchungen angesetzt. Urlaub, Krankheit und Feiertage
  werden nicht erfasst; Wochen ohne Buchung erzeugen keine Minusstunden.
- Offene Buchungen zählen nur am heutigen Tag (bis jetzt) in die Arbeitszeit.
- Zeiten minutengenau; Buchungen über Mitternacht werden als Folgetag gerechnet.

Die ArbZG-Hinweise sind Orientierung, keine Rechtsberatung. Bei Fragen zur betrieblichen
Arbeitszeitregelung bitte Rechtsabteilung prüfen.

## Tests

```bash
npm test
```
