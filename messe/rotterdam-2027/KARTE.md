# Kartenansicht im Feind Cockpit (v3.2)

Gilt für `feind-cockpit-v3.html`, das ist die Quelle des Artefakts „Feind Cockpit (Copy)“
(https://claude.ai/artifact/GRG81suHXorrC1Lekymu9i). Betroffen sind der Reiter
**Marketing › Ausschreibungen** (Choropleth und Pins) und **Wissen › Projektkarte › Straßenkarte**.

## Was die Karte zeigt

| Element | Quelle | Verhalten |
|---|---|---|
| Umrisse Deutschland, Nachbarländer, 16 Bundesländer | Natural Earth (gemeinfrei), eingebettet in `<script id="geoData">` | immer offline, keine Requests |
| Färbung der Bundesländer | Anzahl Ausschreibungen je Land (bestehende Zählung `countFor`) | Stufen aus `FC.geoLogic.classes()`, Legende unter der Karte |
| Pins Ausschreibungen | Feld `ort`/`location`/`landkreis` → eingebautes Ortsverzeichnis | gebündelt (Leaflet.markercluster), gestrichelt = Ort mehrdeutig |
| Standorte Lübben und Wittenburg | `HOME_SITES` | eigene Markierung, nie gebündelt |
| Straßenkarte | Kachelanbieter aus der Admin-Konfiguration, sonst OpenStreetMap | erst nach Einwilligung |

**Farbskala:** Stufe 0 = keine Ausschreibung (weiß bzw. Hintergrund), danach höchstens vier
Stufen von 1 bis zum Maximum. Untergrenzen: `1 + floor(i · max / k)`, `k = min(4, max)`.
Beispiel: Maximum 10 ergibt 1–2, 3–5, 6–7, 8–10. Die Fläche ist immer CI-Grün `--accent` mit
steigender Deckkraft (0,2 bis 0,7). Standort-Bundesländer haben einen grünen Umriss, das
gewählte Land einen Umriss in `--focus`.

**Filter:** Ein Klick auf ein Bundesland ruft den bestehenden Regionsfilter `pick(name)` auf. Ein
zweiter Klick hebt ihn auf. Die Filterlogik selbst ist unverändert. Die Kachelansicht
darunter („per Tastatur bedienbar“) bleibt als barrierearme Alternative erhalten.

**Bedienung:** Mausrad, zwei Finger, Knöpfe +/− und Tastatur (Karte mit Tab anwählen, dann
Plus/Minus und Pfeiltasten). Pins mit Aktion sind per Tab erreichbar und lösen mit Enter aus.

## Datenschutz und Lizenzen

- **Ohne Einwilligung keine externen Requests.** Die Umrisskarte ist eingebettet, ebenso die
  Schrift Exo (SIL OFL 1.1, aus `@fontsource/exo` 5.3.0). Google Fonts wird nicht mehr geladen.
- **Einwilligung:** „Straßenkarte laden“ öffnet einen Dialog mit Anbietername, Host, Zweck und
  dem Hinweis auf die IP-Übertragung. Gespeichert wird nur im Browser der Person:
  `localStorage["feind-cockpit:osm-consent"] = { host, at, on }`.
  - Die Einwilligung gilt **je Anbieter-Host**. Nach einem Anbieterwechsel fragt die Karte neu.
  - „Straßenkarte an“ schaltet aus und behält die Einwilligung. „Einwilligung widerrufen“ löscht sie.
  - Der alte Schalter `feind-cockpit:osm` aus Version 3 wird beim Laden entfernt. Er war keine
    Einwilligung, deshalb fragt die Karte einmal neu.
- **OpenStreetMap-Kacheln** (`tile.openstreetmap.org`) sind laut
  [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) nur für geringe Last
  gedacht und ohne Verfügbarkeitszusage. Die Karte kennzeichnet das als „Testbetrieb“.
- **Namensnennung:** „© OpenStreetMap-Mitwirkende“ mit Link auf /copyright steht bei jeder
  Straßenkarte unten rechts (ODbL). Der Text des Anbieters kommt dazu. Er wird als reiner Text
  übernommen, HTML wird maskiert.
- Datenflüsse und Textbaustein für den Datenschutzhinweis: `docs/datenschutz/datenschutzbericht.md`,
  Abschnitt 12.1. **Bitte Rechtsabteilung prüfen.**

| Bibliothek | Version | Lizenz | Einbindung |
|---|---|---|---|
| Leaflet | 1.9.4 | BSD-2-Clause | inline |
| Leaflet.markercluster | 1.5.3 | MIT | inline (JS + `MarkerCluster.css`), Optik über CI-Tokens |
| Exo (Latin, 500–800) | @fontsource/exo 5.3.0 | SIL OFL 1.1 | `@font-face` als data-URL |

## Kachelanbieter wechseln (ohne Code)

Admin › Konfiguration › **Funktionen und Quellen** › Karte „Straßenkarte: Kachelanbieter“.

**Schnellweg über die Vorlage:** Unter „Vorlage (EU-Endpunkt)“ den Eintrag „Stadia Maps, EU-Endpunkt
(Alidade Smooth)“ wählen und auf „Vorlage übernehmen“ klicken. Danach den API-Key an die Kachel-URL
anhängen. Solange er fehlt, meldet die Karte „API-Key fehlt in der Kachel-URL“.

| Feld | Vorlage Stadia Maps (EU) |
|---|---|
| Anbietername | Stadia Maps (EU) |
| Kachel-URL | `https://tiles-eu.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=…` |
| Namensnennung | `© Stadia Maps © OpenMapTiles` (OSM wird automatisch ergänzt) |
| Link Datenschutzhinweise | `https://stadiamaps.com/privacy/privacy-policy/` |

Warum Stadia: Stadia dokumentiert EU-only-Endpunkte mit Servern in Frankfurt und Paris
([docs.stadiamaps.com/eu-gdpr-endpoints](https://docs.stadiamaps.com/eu-gdpr-endpoints/), abgerufen am
01.10.2026). Die Karte erkennt diesen Host und zeigt im Admin-Bereich und im Einwilligungsdialog
„EU-Endpunkt“ an. Bei jedem anderen Host steht dort „EU-Verarbeitung nicht belegt, Anbieter prüfen“.

- **Kosten:** Stadia unterscheidet kommerzielle und nicht-kommerzielle Nutzung. Den passenden Tarif
  vor dem Live-Betrieb prüfen und von David freigeben lassen.
  `{r}` lädt auf Retina-Displays die @2x-Kacheln.
- **MapTiler:** In der Dokumentation ist nur `api.maptiler.com` beschrieben. Den in der
  Arbeitsanweisung genannten Endpunkt `api.maptiler.eu` konnte ich nicht belegen, deshalb gibt es
  dafür keine Vorlage. Wer MapTiler einsetzen will, trägt die URL von Hand ein und klärt den
  Verarbeitungsort per AVV.

Dann veröffentlichen. Gespeichert wird in `admin/config` → `mapTiles`, bereinigt durch
`FC.config.merge()`. Prüfregeln stehen in `FC.geoLogic.provider()`: nur `https`, Platzhalter
`{z}`, `{x}` und `{y}` sind Pflicht. Ist die URL ungültig, gilt OpenStreetMap und die Karte zeigt den Grund an.

Hinweise:
- Ein API-Key in der Kachel-URL ist im Browser sichtbar. Beim Anbieter auf die Domain des
  Artefakts beschränken. Den Key nicht ins Repository schreiben, sondern nur in der
  Admin-Konfiguration pflegen.
- Ob der claude.ai-Viewer Kacheln eines Hosts zulässt, hängt von dessen Inhaltsrichtlinie ab. Lädt
  nichts, schaltet die Karte nach drei Fehlern auf die Umrisskarte zurück und meldet das.
- Self-Hosting (PMTiles/OpenMapTiles) passt nicht ins Artefakt (Größenlimit 16 MB). Dafür bräuchte
  es einen eigenen Kachelserver, den man dann hier als URL einträgt.

## Aufbau im Code

| Modul in `feind-cockpit-v3.html` | Aufgabe |
|---|---|
| `geo-logic.js` | reine Funktionen: `classes()`, `provider()` (inkl. `eu`, `warning`), `presets()`, `consent.read/grant/setOn` |
| `geomap.js` | `app.geoMap(opts)`: Leaflet, Einwilligungsdialog, Legende, Cluster, Lazy-Init per IntersectionObserver, Ladehinweis (`aria-busy`), Wiederverwendung der Karte bei Filterwechsel |
| `config.js` | `mapTiles` in `merge()` |
| `app-admin.js` | Karte „Straßenkarte: Kachelanbieter“ mit Vorlage „Stadia Maps, EU-Endpunkt“ |
| `app-marketing.js` | `regionMap()`: liefert Zählung, Auswahl und Pins an `app.geoMap` |

## Tests

```bash
npm install                      # einmalig, holt playwright
npm run test:cockpit             # Unit: geo-logic.js, config.js (node --test)
npm run test:cockpit:e2e         # E2E: Chromium, Seite vom Test-Ursprung http://cockpit.test
```

Ist Chromium nicht über Playwright installiert, setzt man `PW_CHROMIUM=/pfad/zu/chrome`. Die E2E-Tests liefern die Seite selbst unter `http://cockpit.test` aus, nicht per `file://`. Dort verliert
Chromium `localStorage` gelegentlich beim Neuladen. Jeder Request an einen anderen Ursprung wird mitgeschrieben. Geprüft wird:
- Ohne Einwilligung gibt es keinen Request, auch keine Schrift.
- Der Dialog nennt den Anbieter, Abbrechen lädt nichts.
- Nach der Einwilligung kommen Kacheln vom richtigen Host, die Namensnennung ist sichtbar und die Wahl bleibt nach dem Neuladen.
- Der Widerruf wirkt.
- Ein konfigurierter EU-Anbieter wird genutzt.
- Ein Klick auf ein Land setzt den Filter.
- Beim Filterwechsel bleiben Karte und Zoom erhalten.
- Cluster sind aktiv.
- Die Tastatur zoomt.

## Bekannte Grenzen

- Pins gibt es nur für Orte, die das eingebaute Ortsverzeichnis findet. Beispiel: „München“
  wurde im Test nicht gefunden, das Land Bayern wird trotzdem gezählt und eingefärbt.
- Seit v3.2 bleibt die Leaflet-Karte über Renderläufe erhalten. Ein Filterwechsel färbt nur die
  Länder neu (`setStyle`) und tauscht die Pins nur, wenn sich Lage, Text oder Art geändert haben.
  Ausschnitt und Zoom bleiben stehen. Neu aufgebaut wird die Karte nur, wenn Anbieter,
  Einwilligung, Modus (mit/ohne Länderfilter) oder Theme wechseln. Der E2E-Test „Filterwechsel“ prüft das.

## Abgleich mit der Arbeitsanweisung „Kartenansicht (Leaflet)“ vom 01.10.2026

| Akzeptanzkriterium | Stand | Nachweis |
|---|---|---|
| Keine externen Requests ohne Einwilligung | erfüllt | E2E „ohne Einwilligung: keine externen Requests“ |
| Nach Einwilligung EU-Anbieter oder self-hosted | technisch erfüllt (Vorlage Stadia EU), **Entscheidung offen** | E2E „EU-Endpunkt Stadia“; Live-Betrieb braucht Key und Tarif |
| „© OpenStreetMap-Mitwirkende“ sichtbar | erfüllt | Unit „OSM-Namensnennung ist Pflicht“, E2E Namensnennung |
| Choropleth über alle 16 Länder | erfüllt | Unit Farbklassen |
| Pins inkl. Lübben und Wittenburg | erfüllt | E2E „Pins werden geclustert, Standorte bleiben einzeln“ |
| Klick auf Bundesland setzt Regionsfilter | erfüllt | E2E Regionsfilter |
| Zoom per Mausrad, Touch, +/−, Tastatur | erfüllt | E2E Tastatur, Leaflet-Standard |
| Layer-Toggle mit gespeicherter Wahl | erfüllt | E2E „Wahl bleibt nach Neuladen“ |
| Marker-Clustering aktiv | erfüllt | E2E Cluster |
| Datenschutzerklärung um Kachelanbieter ergänzt | erfüllt als Entwurf (Bericht v1.4, Abschnitt 12.1) | **Bitte Rechtsabteilung prüfen** |
| Keine unnötigen Re-Renders bei Filterwechsel (Abschnitt 10) | erfüllt | E2E „Filterwechsel: Karte bleibt dieselbe“ |
| Tests vorhanden und grün | erfüllt | `npm run test:cockpit`, `npm run test:cockpit:e2e` |
| Dokumentation aktualisiert | erfüllt | diese Datei |

Self-Hosting (PMTiles/OpenMapTiles) bleibt außerhalb des Artefakts, siehe Hinweise oben.
