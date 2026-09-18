# GPS-Fahrten-Dashboard

Lokales Dashboard zur Auswertung von xoGPS-Exporten (Fahrten, Stopps, Auffälligkeiten) –
Umsetzung der Design-Spezifikation vom 18.09.2026.

> **Privatprojekt** (kein Bezug zu Fräsdienst Feind). Liegt hier bewusst in einem
> abgegrenzten Unterordner.

## Schnellstart

1. **`gps-dashboard.html`** per Doppelklick im Browser öffnen (Chrome, Firefox oder Edge).
2. Deine Export-Datei (CSV oder XLSX) in die Fläche ziehen – oder **`beispiel-fahrten.csv`**
   zum Ausprobieren laden.
3. Beim ersten Import werden die Spalten automatisch erkannt; falls nicht, erscheint
   einmalig ein Zuordnungsdialog (wird gespeichert).

Es wird **kein Server** benötigt. **Positionsdaten verlassen den Browser nicht** – lediglich
die Kartenkacheln kommen von OpenStreetMap und die Bibliotheken (Leaflet, PapaParse, SheetJS)
von cdnjs. Dafür ist beim Öffnen eine Internetverbindung nötig.

## Funktionen (laut Spec)

- **Kennzahlen-Kacheln:** km · Fahrzeit · Stopps · kurze Stopps · Auffälligkeiten (rot bei > 0)
- **Karte:** Strecke nach Tempo eingefärbt, Stopp-Punkte dauerabhängig groß (grau / gelb / rot),
  Klick zeigt Popup mit Zeit, Dauer und Ort
- **Tageszeitleiste:** eine Zeile je Tag, Fahrten als Balken, Auffälligkeiten als Marker
- **Listen:** Fahrten / Stopps / Auffälligkeiten; Klick springt auf der Karte an die Stelle;
  privat/beruflich je Fahrt setzbar
- **Filter:** Zeitraum, Tag, Kategorie, Ereignistyp
- **Export:** CSV der Fahrtenliste, Druck-/PDF-Ansicht

## Erkennungsregeln

Standardwerte gemäß Spec §4, alle im **Zahnrad-Menü (⚙️)** änderbar. Entfernungen nach der
Haversine-Formel; Positionssprünge (> 250 km/h) werden als GPS-Fehler markiert und bei km
und Tempo nicht mitgezählt. Fehlt eine Geschwindigkeitsspalte, wird das Tempo aus Strecke
und Zeit berechnet.

## Zeitzone

Zeitstempel werden standardmäßig als **Europe/Berlin** interpretiert (DST-sicher). Liefert der
Export UTC, oben rechts auf **UTC** umschalten und die Datei erneut laden.

## Selbsttest (Detector-Unit-Tests)

Die Erkennungslogik (`GPS.detector`) besteht aus reinen Funktionen mit Unit-Tests (Spec §7:
Ampelhalt, Tankstopp, Parken, Nachtfahrt, Positionssprung, Datenlücke, Zündung vorhanden/
nicht vorhanden, Tempo).

- Im Browser: **⚙️ → „Selbsttest ausführen"**, oder die Datei mit `#selftest` am Ende der
  URL öffnen.

## Bekannte Grenzen / offene Punkte

- **Echte xoGPS-Beispieldatei** fehlt noch (Spec §8). `beispiel-fahrten.csv` ist synthetisch;
  Spaltennamen, Einheiten und Zeitformat werden final anhand eines echten Exports geschärft.
- Enthält der Export eine **Zündungsspalte (ACC)**, wird sie automatisch erkannt und für die
  Stopp-Erkennung genutzt.
- **Fahrtenbuch:** liefert nur eine Arbeitsgrundlage. Für ein steuerlich anerkanntes
  Fahrtenbuch gelten eigene Anforderungen – **bitte Steuerberater prüfen.**

## Dateien

| Datei | Zweck |
|---|---|
| `gps-dashboard.html` | Das komplette Dashboard (self-contained, inkl. Detector + Selbsttest) |
| `beispiel-fahrten.csv` | Synthetische Demo-Daten (2 Tage, alle Ereignistypen) |
