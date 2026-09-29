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

Es wird **kein Server** benötigt und **Positionsdaten verlassen den Browser nicht**.

**Offline nutzbar:** Die Bibliotheken (Leaflet, PapaParse, SheetJS) sind direkt in
`gps-dashboard.html` eingebettet – die Datei läuft ohne Internet. Einzige Ausnahme ist der
**Kartenhintergrund** (OpenStreetMap-Kacheln): Ohne Internet bleibt die Kartenfläche leer,
aber Strecke, Marker und **alle Auswertungen, Kennzahlen und Listen funktionieren weiter**
(ein Hinweis erscheint automatisch).

## Funktionen (laut Spec)

- **Kennzahlen-Kacheln:** km · Fahrzeit · Stopps · kurze Stopps · Auffälligkeiten (rot bei > 0)
- **Karte:** Strecke nach Tempo eingefärbt, Stopp-Punkte dauerabhängig groß (grau / gelb / rot),
  Klick zeigt Popup mit Zeit, Dauer und Ort
- **Tageszeitleiste:** eine Zeile je Tag, Fahrten als Balken, Auffälligkeiten als Marker
- **Listen:** Fahrten / Stopps / Auffälligkeiten; Klick springt auf der Karte an die Stelle;
  privat/beruflich je Fahrt setzbar
- **Ortsnamen:** Enthält der Export eine Adress-/`Position`-Spalte, werden die Adressen
  automatisch als Ort in Popups und Listen angezeigt (benannte Orte haben Vorrang).
- **Filter:** Zeitraum, Tag, Kategorie, Ereignistyp
- **Auswertung (Tab):** Fahrten-Statistik (Ø/längste Fahrt, Ø-Tempo, Nachtfahrten, Tempo- und
  Kurzhalt-Zähler), km-Aufteilung privat/beruflich, Monats- und Wochenübersicht,
  häufigste Ziele/Orte.
- **Kurzhalte (15–50 s):** sehr kurze Stillstände werden als Auffälligkeit gelistet.
  **Hinweis:** ob ein Kurzhalt an einer Kreuzung/Ampel liegt, lässt sich offline ohne
  Straßendaten nicht automatisch bestimmen – die Liste dient der manuellen Prüfung
  (Zeit + Adresse werden angezeigt). Fenster im Zahnrad-Menü einstellbar.
- **Export:** CSV der Fahrtenliste · **Fahrtenbuch-CSV** (Datum, Start/Ziel mit Adresse,
  gefahrene km, km-Stand Anfang/Ende, Zweck, Notiz) · Druck-/PDF-Ansicht.
  km-Stand wird ab einem optionalen Startwert (Zahnrad → Fahrtenbuch) fortlaufend gefüllt,
  sonst bleiben die Spalten zum manuellen Nachtragen leer. **GPS liefert keinen echten
  Tacho-Kilometerstand – für ein steuerlich anerkanntes Fahrtenbuch bitte Steuerberater prüfen.**

## Erkennungsregeln

Standardwerte gemäß Spec §4, alle im **Zahnrad-Menü (⚙️)** änderbar. Entfernungen nach der
Haversine-Formel; Positionssprünge (> 250 km/h) werden als GPS-Fehler markiert und bei km
und Tempo nicht mitgezählt. Fehlt eine Geschwindigkeitsspalte, wird das Tempo aus Strecke
und Zeit berechnet. Beginnt oder endet eine Fahrt mit einer längeren Datenlücke vor einem
stehenden Punkt (z. B. eine veraltete Parkposition), wird dieser Punkt aus der Fahrt
herausgetrimmt – Start-/Zielzeit bleiben realistisch.

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

## Corporate Design

Das Dashboard nutzt das Fräsdienst-Feind-CI aus `branding/feind-ci.tokens.json`
(Grün `#84bb20` als Akzent-/Flächenfarbe mit Anthrazit-Text, `accent-text` `#5e8a14`
für Text auf hellem Grund, Rot `#e3000b` nur als Signal, Schrift Exo/Helvetica).
Farben sind ausschließlich als CSS-Tokens definiert. **Hell- und Dunkel-Theme** werden
mitgeliefert (automatisch nach Systemeinstellung; oben rechts auf **Auto / Hell / Dunkel**
umschaltbar).

Für ein helleres, freundlicheres Erscheinungsbild weicht das Dashboard bewusst in einem
Punkt von den strikten CI-Tokens ab: **größere Eckradien** (Karten ~12 px, Buttons ~10 px)
statt der 0/2/4 px des Tokensets, dazu weichere Schatten, ein warm-heller Hintergrund und
grüne Akzente (Header-Linie, KPI-Akzentbalken, aktiver Tab). Farbwerte und Kontrastregeln
der CI bleiben unverändert.

Die Tempo-Einfärbung der Karte ist eine funktionale Datenskala im CI-Rahmen
(Neutralgrau → Grün-Abstufungen → Signalrot); es werden keine markenfremden Farben
verwendet.

## Offline-Build (für Entwickler)

Die verteilte `gps-dashboard.html` wird aus einer wartbaren Quelle erzeugt, damit die
Bibliotheks-Blobs die eigene Logik nicht überlagern:

- `gps-dashboard.src.html` – editierbare Quelle; lädt die Bibliotheken über relative
  `vendor/`-Pfade (funktioniert lokal ebenfalls offline, wenn der `vendor/`-Ordner daneben liegt).
- `vendor/` – die Bibliotheken (per `npm pack` bezogen, exakte Versionen).
- `build.mjs` – ersetzt die `<!-- BUILD:… -->`-markierten Tags durch inline-Blöcke.

Neu bauen nach Änderungen an Quelle oder Bibliotheken:

```bash
node build.mjs        # erzeugt gps-dashboard.html mit eingebetteten Bibliotheken
```

## Dateien

| Datei | Zweck |
|---|---|
| `gps-dashboard.html` | Verteilte Einzeldatei, Bibliotheken eingebettet, **offline nutzbar** |
| `gps-dashboard.src.html` | Wartbare Quelle (Bibliotheken über `vendor/`) |
| `build.mjs` | Build: bettet `vendor/`-Bibliotheken in die Einzeldatei ein |
| `vendor/` | Leaflet 1.9.4 (BSD-2), PapaParse 5.4.1 (MIT), SheetJS 0.18.5 (Apache-2.0) |
| `beispiel-fahrten.csv` | Synthetische Demo-Daten (2 Tage, alle Ereignistypen) |
