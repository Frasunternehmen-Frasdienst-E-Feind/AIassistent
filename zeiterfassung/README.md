# Stempeluhr – Zeiterfassung

Weiterentwicklung der Google-Tabelle „Zeiterfassung_David-Halko" zu einer eigenständigen
Zeiterfassung. Zwei Betriebsarten:

| Betriebsart | Start | Datenablage | OptiTime |
| --- | --- | --- | --- |
| **Windows-Programm** `Stempeluhr.exe` | Doppelklick | je Windows-Benutzer unter `%APPDATA%\Stempeluhr\<Benutzer>\data.json` | wird bei jedem Start gesucht und eingelesen |
| **HTML-Seite** `index.html` | im Browser öffnen | Browser (localStorage) | nur per CSV-Import |

## Windows-Programm (EXE)

`Stempeluhr.exe` ist eine einzelne Datei ohne Installation. Beim Start:

1. **Benutzer ermitteln**: Windows-Anmeldename, Anzeigename, Domäne, Rechner.
2. **OptiTime-Ordner suchen**, in dieser Reihenfolge: Startparameter `--optitime`,
   Umgebungsvariable `OPTITIME_PATH`, gespeicherter Pfad aus den Einstellungen, dann
   automatische Suche nach einem Ordner mit „OptiTime" im Namen unter OneDrive, Benutzerprofil
   (Dokumente, Desktop, Downloads), `%APPDATA%`, `%LOCALAPPDATA%`, `%ProgramData%`,
   `%ProgramFiles%`, `%ProgramFiles(x86)%`, `%PUBLIC%` und allen lokalen Festplatten
   (jeweils bis zwei Ebenen tief; Netzlaufwerke nur über expliziten Pfad, damit nichts hängt).
3. **Dateien einlesen**: alle `.csv`, `.txt`, `.tsv`, `.json` bis vier Ebenen unter dem Ordner.
   Zeichensätze UTF-8 (mit/ohne BOM), UTF-16 und Windows-1252 werden erkannt.
   Zwei Formate werden verstanden:
   - **Intervall**: Spalten `Datum`, `von`, `bis` (+ optional `Auftrag`, `Tätigkeit`, `Zeitart`, `Bemerkung`).
   - **Ereignisse** (Terminal-Buchungen): `Datum`, `Uhrzeit`, `Buchung` mit Werten wie
     „Kommen", „Pause Beginn", „Pause Ende", „Gehen"; sie werden zu Buchungen gepaart.
   Spaltennamen werden tolerant erkannt (z. B. `Beginn`/`Start`, `Ende`, `Mitarbeiter`,
   `Personalnummer`, `PersNr`, `Benutzer`, `Login`).
4. **Nur eigene Daten übernehmen**:
   - Hat die Datei eine Personenspalte, werden nur Zeilen übernommen, die zum Windows-Konto
     (Anmeldename, Anzeigename), zur Personalnummer oder zum in den Einstellungen bestätigten
     Namen passen. Zeilen anderer Personen werden gezählt, aber nie importiert.
   - Ist die Zuordnung nur automatisch über den Windows-Namen erfolgt, zeigt die App
     „automatisch erkannt – bitte bestätigen". Mit „Das bin ich" wird sie fest gespeichert.
   - Dateien **ohne** Personenspalte werden nur übernommen, wenn Dateiname oder Ordner den
     Benutzer nennen oder die Datei im eigenen Benutzerprofil liegt. Andernfalls erscheinen sie
     als „nicht zugeordnet".
5. **Oberfläche öffnen**: lokaler Server nur auf `127.0.0.1` mit freiem Port, Standardbrowser
   startet automatisch. Wird das Browserfenster geschlossen, beendet sich das Programm nach
   zwei Minuten von selbst; „Stempeluhr beenden" beendet sofort.

OptiTime ist führend: Bei jedem Abgleich ersetzt eine OptiTime-Buchung eine vorhandene Buchung
mit gleichem Datum und gleicher Startzeit. Manuelle Buchungen bleiben sonst erhalten.

### Startparameter

```
Stempeluhr.exe --optitime "\\server\OptiTime\Export"   OptiTime-Ordner fest vorgeben
Stempeluhr.exe --data "C:\Users\...\OneDrive\Stempeluhr"  Datenordner (z. B. OneDrive für mehrere Geräte)
Stempeluhr.exe --port 8123 --no-browser                  fester Port, Browser nicht öffnen
Stempeluhr.exe --idle 0                                  nie automatisch beenden
```

Protokoll: `%APPDATA%\Stempeluhr\stempeluhr.log`. Einstellungen: `%APPDATA%\Stempeluhr\config.json`.
`Stempeluhr-Konsole.exe` ist dieselbe App mit sichtbarem Konsolenfenster für die Fehlersuche.

### Mehrere Geräte

Die EXE ist portabel (z. B. auf einem USB-Stick oder Netzlaufwerk). Auf jedem Gerät gilt der dort
angemeldete Benutzer; die Daten liegen je Gerät in `%APPDATA%`. Sollen manuelle Buchungen auf allen
Geräten gleich sein, den Datenordner per `--data` auf einen OneDrive-Ordner legen.

### Bauen

```bash
./build.sh          # Tests + Windows-Build nach dist/ (Go 1.24+, keine externen Module)
```

## Funktionen der Oberfläche

- **Stempeluhr**: Kommen · Pause · Weiter · Gehen mit Live-Uhr und Status.
- **Tagesübersicht**: Einstempelzeit, Ausstempelzeit, Pausen, Netto/Brutto, KW, Tages-Soll, Überstunden.
- **Buchungen**: alle Einzelbuchungen (Auftrag 000999 „Kommen" / 000007 „*Pause*"), bearbeiten, nachtragen,
  löschen, Monatsfilter; OptiTime-Buchungen sind markiert.
- **Wochen**: Ist vs. Soll je Tag als Balken, Wochensumme, Überstunden.
- **Hinweise nach ArbZG**: Pause < 30 min bei > 6 h, < 45 min bei > 9 h, > 10 h/Tag, nicht ausgestempelte Buchungen.
- **Import/Export**: CSV (Semikolon, Excel-tauglich) für Buchungen und Tage, JSON-Backup, Import aus CSV oder JSON.
- **Einstellungen**: Wochenstunden und Arbeitstage → Tages-Soll.

In der HTML-Betriebsart sind die Buchungen vom 17.08. bis 07.09.2026 aus der Google-Tabelle vorgeladen
(`seed-data.js`); in der EXE lassen sie sich über „Daten aus Google-Tabelle laden" nachladen.

## Dateien

| Datei | Zweck |
| --- | --- |
| `main.go` | Windows-Programm: Benutzer, lokaler Server, Datenablage |
| `optitime.go` | OptiTime-Pfadsuche, Dateiformate, Zuordnung zum Benutzer |
| `sys_windows.go` / `sys_other.go` | Plattformteile (Laufwerke, Browser, Meldungsfenster) |
| `index.html`, `app.js` | Oberfläche (wird in die EXE eingebettet) |
| `zeit.js` | Reine Berechnungslogik (Browser und Node) |
| `seed-data.js` | Startdaten aus der Google-Tabelle |
| `test/zeit.test.js`, `optitime_test.go` | Tests (`npm test`, `go test ./...`) |

## Annahmen

- Tages-Soll = Wochenstunden ÷ Anzahl Arbeitstage (Standard 40 h / 5 Tage = 8:00 h), nur für Tage mit Buchungen.
- Urlaub, Krankheit und Feiertage werden nicht erfasst.
- Offene Buchungen zählen nur am heutigen Tag (bis jetzt) in die Arbeitszeit.
- Das OptiTime-Exportformat wurde tolerant angenommen (siehe oben). Excel-Dateien (`.xlsx`) werden nicht gelesen;
  in OptiTime als CSV exportieren.

Die ArbZG-Hinweise sind Orientierung, keine Rechtsberatung. Bei Fragen zur betrieblichen Arbeitszeitregelung
bitte Rechtsabteilung prüfen.
