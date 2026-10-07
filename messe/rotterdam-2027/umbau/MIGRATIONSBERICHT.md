# Migrationsbericht: Feind Cockpit „textlastig zu visuell“

Quelle der Arbeit: `feind-cockpit-v3.html` (Stand des Artefakts „Feind Cockpit“ TfuzbG vom 07.10.2026).
Farbregeln: `branding/farbsystem.md` (Version 1.1) und `branding/feind-ci.tokens.json`.

| Phase | Inhalt | Stand |
|---|---|---|
| 0 | Führende Quelle, Regression Kachelanbieter, Text-Ausgangsmessung | erledigt |
| 1 | `charts.js`, Diagramm-Tokens, Referenzmodul Lead-Zähler, Themenbanner-Muster | freigegeben 07.10.2026 |
| 2 | InfraTech: Dashboard, Aufgaben, Fristen, Budget, KPI; Banner auf allen Seiten; Meeting-Modus; Exporte | freigegeben 07.10.2026, veröffentlicht (TfuzbG v36) |
| 3 | Marketing: Copilot, Content, Leads, Ausschreibungen, Events, SEO, 90-Tage-Plan; `lineChart()` → `charts.line()` | **wartet auf Freigabe** |
| 4 | Abnahme: Bewegung, Druck, lokaler Modus, Viewer, Kontrast-Audit | offen |

---

## Phase 1

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `feind-cockpit-v3.html` | neues UMD-Modul `charts.js`, Block `charts.css`, Tokens, Lead-Zähler neu, `app.themeBanner()`, Druckregel für `<details>` |
| `test/charts.test.mjs`, `test/fake-dom.mjs` | 18 Unit-Tests für die Bausteine (Node, ohne Browser) |
| `e2e/leadzaehler.e2e.mjs` | 4 E2E-Tests: Werte, Animation nur für Geändertes, reduzierte Bewegung, Druck |
| `tools/textmass.mjs` | Text nur für Screenreader (`.sr-only`) zählt nicht als sichtbarer Text |

Unverändert: `helpers.js`, `data.js`, `model.js`, `store.js`, `commands.js`, `migrate.js`, `config.js`, `ai.js`,
`icons.js`, `localdb.js`, `connect-logic.js`, alle Datenpfade, Feldnamen, Exporte und `admin/config.version`.
Der Lead-Zähler zählt weiter über `app.cmd.leads.bump`.

### Diagramm-Bausteine (`FC.charts`)

`donut`, `bars`, `stackedBars`, `line`, `sparkline`, `histogram`, `timeline`, `funnel`, `waterfall`,
`progressRing`, `heatmap` und dazu `ticker` für KPI-Zahlen. Jeder Baustein:

- gibt ein Element zurück und greift nur über `opts.doc` auf das Dokument zu; mehrfach aufrufbar, die Eingabe bleibt unverändert,
- hat `role="img"`, `aria-label` und `<title>`; mit `opts.table: true` dieselben Werte als `<details>`-Tabelle,
- färbt nur über Ton-Klassen (`fc-k-s1 … s3`, `ok`, `warn`, `crit`, `info`, `muted`), nie mit festen Farbwerten (per Test geprüft),
- zeichnet den Endzustand in die Attribute. Bewegung entsteht über Web Animations, die bei `prefers-reduced-motion`, im Druck und ohne `el.animate` entfallen,
- macht klickbare Marken per Tab erreichbar, löst mit Enter oder Leertaste aus und meldet den Zustand über `aria-pressed`.

**Darstellungsentscheidung:** Horizontale Balken (`bars`, `stackedBars`, `funnel`) sind HTML-Zeilen mit SVG-Balken.
Beschriftung und Werte bleiben so auf Handy und Desktop gleich groß. Ein reines SVG mit `viewBox` hätte die Schrift
auf dem Desktop verdoppelt und auf dem Handy halbiert, siehe erster Screenshot-Durchlauf.

**Bewegung:** Die Animationen halten sich an Abschnitt 3 der Arbeitsanweisung. Ringe und Balken wachsen in 600 ms,
Linien zeichnen sich in 800 ms, Hover und Fokus skalieren höchstens auf 1.02 in 120 ms. Nach `app.refresh()`
bewegen sich nur geänderte Werte. Das Modul vergleicht dafür mit dem zuletzt gezeigten Stand und animiert von 0
nur beim Betreten. Einen Endlos-Loop gibt es nicht.

### Neue und geänderte Tokens (`tokens.css`)

| Token | Hell | Dunkel | Kontrast / Rolle |
|---|---|---|---|
| `--chart-1` | `#84bb20` | `#84bb20` | Serie 1; hell 2,31:1 → immer mit Wertbeschriftung, dunkel 5,30:1 |
| `--chart-2` | `#424e4e` | `#e7ecec` | Serie 2; 8,64:1 bzw. 10,25:1 |
| `--chart-3` | `#c9d3d3` | `#4d5858` | Serie 3 / Rest; < 3:1, deshalb immer mit Kontur |
| `--chart-3-edge` | `#5f6969` | `#b8bfbf` | Kontur Serie 3; 5,66:1 bzw. 6,54:1 |
| `--chart-track` | `#e6eaea` | `#384242` | Hintergrundspur |
| `--warn` | `#d6e000` (vorher `#b5730a`) | `#d6e000` (vorher `#f0b440`) | Signal-Gelbgrün, nur Fläche; zum dunklen Panel 8,45:1 |
| `--on-warn` | `#424e4e` | `#424e4e` | Schrift/Symbol auf `--warn`: 5,97:1 |
| `--warn-text` | `#424e4e` (vorher `#8a5500`) | `#d6e000` | Warntext auf neutralem Grund |
| `--warn-soft` | `#f2f4f4` (vorher Beige `#fbf0dc`) | `#384242` | Hinweisflächen |
| `--accent-text` | `#4d7311` (vorher `#5e8a14`) | unverändert | 5,56:1 statt 4,10:1 (vorher unter AA) |
| `--info`, `--info-text` | `#2c5a7a`, `#1f455c` | `#8fb6d1` | Info-Status (Farbsystem 1.1) |

`--chart-4` bis `--chart-6` habe ich bewusst nicht angelegt. Laut Farbsystem 1.1 lassen sich nur drei Füllfarben
sicher unterscheiden. Bei mehr Kategorien gilt Top-N + „Sonstiges“ (`FC.charts.topN`). Im Druck gelten immer die
hellen Werte. Bernstein, Braun und Beige kommen in der Datei nicht mehr vor.

Pillen und Chips „bald fällig“ (`.pill.soon`, `.chip.yellow` usw.) stehen jetzt als Gelbgrün-Fläche mit
Anthrazit-Schrift. Kleine Warnpunkte haben eine Anthrazit-Kontur, weil Gelbgrün auf Weiß nur 1,45:1 hat.

### Referenzmodul Lead-Zähler

| | vorher | nachher |
|---|---|---|
| Primär | 5 KPI-Kacheln, Text-Einleitung | Themenbanner, 2 Kennzahlen mit Ticker, Ziel-Fortschrittsbalken (300) mit Markern nach Tag 1–4 |
| Sekundär | 4 Karten mit Zählzeilen | 4 Tagesringe (Anteil am Tagesziel 75, Segmente A/B/C) mit den bisherigen −/+-Knöpfen |
| Hintergrund | Erläuterungen im Fließtext | gestapelte Balken A/B/C je Tag mit Tabelle; Einstufung und Speicherort in `<details>`, Einstufung als Tooltip an „A/B/C“ |

**Sichtbarer Text** (`tools/textmass.mjs`, leere Daten wie bei der Ausgangsmessung): **568 → 282 Zeichen (−50 %)**.
Ziel war mindestens −40 %. Alle anderen Reiter sind unverändert.

**Datenschutz:** Der Zähler zeigt nur Stückzahlen. Es gibt keine neuen Felder und keine Namen.

### Themenbanner (Eyecatcher, Wunsch aus Artefakt-Kommentar)

`app.themeBanner({ icon, eyebrow, title })` erzeugt ein schmales Band: Anthrazit-Fläche, Fräsrillen als
Linienmuster, grüne Unterkante und ein Symbol aus dem bestehenden Sprite. Es nutzt kein Foto, keine neue Farbe und
lädt nichts nach. Das Band ist rein dekorativ (`aria-hidden`) und im Druck ausgeblendet. In Phase 1 steht es nur
im Lead-Zähler, ab Phase 2 je Reiter mit eigenem Symbol und eigener Kernaussage.

### Tests

- `npm run test:cockpit`: 37 bestanden (davon 18 neu für `charts.js`)
- `npm run test:cockpit:e2e`: 13 bestanden (davon 4 neu für den Lead-Zähler)
- `python3 -m pytest`: 59 bestanden
- Keine Konsolenfehler in Hell, Dunkel und bei 390 px Breite

### Nebenbefund behoben

Neuere Chromium-Versionen zeigen den Inhalt geschlossener `<details>` auch im Druck nicht. Die bisherige Druckregel
griff deshalb nicht mehr. Die neue Regel `details:not([open])::details-content` behebt das für alle Module.

### Entscheidungen

1. Muster freigegeben (07.10.2026).
2. Veröffentlichung in TfuzbG gesammelt nach Phase 2.
3. Offen: Info-Status in Tiefblau `#2c5a7a` steht im Farbsystem, ist aber neu im Cockpit. Bisher ist er Anthrazit.

---

## Phase 2: InfraTech-Welt

### Module

| Modul | Primär | Sekundär | Hintergrund (aufklappbar / Tooltip) |
|---|---|---|---|
| Dashboard | 5 Kennzahlen mit Ticker; „Fällig ≤ 14 T“ mit Sparkline; Ring Gesamtfortschritt + Donut „Aufgaben nach Status“; Balken „Erledigt je Bereich“ (Klick → Aufgaben gefiltert) | Innovationspreis als Zeitachse (Frist, alte Frist, Verleihung, heute) | Messedatum als Tooltip; nächste 5 Fristen kompakt, Priorität und Zuständige im Tooltip; Ampel-Tabelle in `<details>` |
| Aufgaben | Balken „Offen je Bereich“ (Ampel: im Plan / ≤ 14 T / überfällig), Klick oder Enter setzt und löst den Bereichsfilter | Zeitachse „Fällig in 30 Tagen“ (gleiche Tage zusammengefasst) | Bereichsgruppen zu, solange kein Filter aktiv ist; Notizen wie bisher als Tooltip |
| Fristen | Zeitachse heute → 15.01.2027, Farbe nach Quelle (bestätigt / Referenz / Messe), Legende statt Erklärsatz | Hinweis „Offen beim Veranstalter“ | vollständige Tabelle in `<details>` (Export unverändert über die Aktionsleiste) |
| Budget | Ist je Kostenblock mit Forecast-Strich; Ampel der Gesamtabweichung im Kopf | Wasserfall Planrahmen → Blöcke → Puffer | Eingabetabelle in `<details>`; der Zustand bleibt nach dem Speichern offen |
| Ziele & KPIs | Ring je KPI: aktueller Wert gegen Ziel (Leads aus dem Lead-Zähler, Budgetabweichung aus dem Budget), sonst „–“ | – | Baseline und Messmethode im Tooltip und in der Tabelle in `<details>` |

**Themenbanner:** Die Module der Phasen 1 und 2 haben ein eigenes Banner mit Kennzahl. Alle übrigen Seiten in allen
Welten bekommen das Standardbanner des Reiters, mit Symbol aus dem Sprite und einer festen Kernaussage
(`THEME_LINE` in `app-core.js`). Das erledigt den Artefakt-Kommentar „Eyecatcher auf jeder Seite“.

### Sichtbarer Text (leere Daten, `tools/textmass.mjs`)

| Reiter | vorher | nachher | Änderung |
|---|---|---|---|
| Dashboard | 2103 | 1240 | −41 % |
| Aufgaben | 3813 | 1519 | −60 % |
| Fristen | 1348 | 368 | −73 % |
| Budget | 800 | 245 | −69 % |
| Ziele & KPIs | 499 | 253 | −49 % |
| Lead-Zähler | 568 | 282 | −50 % |

Alle anderen Reiter haben jetzt etwa 40 Zeichen mehr, weil das Standardbanner dazukommt.

### Diagramm-Bausteine: Ergänzungen

- `bars`: eigener Wertetext je Zeile (`text`) und Marker je Zeile (`marks`, z. B. Forecast).
- `donut`: animiert nach `app.refresh()` nur geänderte Segmente (`from`).
- `timeline`: fasst gleiche Tage zusammen und verteilt Beschriftungen auf vier Ebenen. Auf schmalen Schirmen scrollt die Achse seitlich, statt die Schrift zu verkleinern.
- `waterfall`: Kosten in Hellgrau (Rot nur als Signal), Puffer grün oder bei Überzug rot.
- Balkenzeilen nutzen CSS-Subgrid, damit Beschriftungen und Balken bündig stehen.

### Bewusste Abweichungen von der Arbeitsanweisung

- **„Erledigt je Bereich“ zeigt alle 12 Bereiche.** Abschnitt 5.1 verlangt das ausdrücklich, Blinder Fleck 4 nennt höchstens 7 Kategorien. Jede Zeile ist beschriftet, und die Farbe trägt nur den Ampelstatus. Die Regel „höchstens 3 Serienfarben“ bleibt also eingehalten.
- **Sparkline nur für „Fällig ≤ 14 T“, und zwar als Vorschau.** Einen Verlauf der letzten 14 Tage gibt es nicht, weil keine Historie gespeichert wird und neue gespeicherte Felder ausgeschlossen sind. Die Linie zeigt deshalb, wie sich die Fälligkeiten auf die nächsten 14 Tage verteilen.
- **„in Arbeit“ ist Anthrazit, nicht Gelb.** Gelbgrün steht laut Farbsystem 1.1 nur für „bald fällig“.

### Unverändert geprüft

- Exporte (CSV, ICS, Markdown, PDF): Code und Spaltenreihenfolge unberührt (`model.js` `build*`).
- Meeting-Modus startet ohne Fehler (E2E). Er nutzt keine der neuen Diagramme.
- Filter, Archiv, Aufgabe bearbeiten, Lead-Bumps, Budget-Eingaben über `app.cmd.*`.

### Tests

- `npm run test:cockpit`: 40 bestanden (`charts.js` 21)
- `npm run test:cockpit:e2e`: 19 bestanden (neu: `infratech-visuell.e2e.mjs` mit 6 Tests)

---

## Phase 3: Marketing-Welt

### Module

| Modul | Primär | Sekundär | Hintergrund |
|---|---|---|---|
| Copilot | Hinweise als Kacheln (Symbol, Zahl, Kurzlabel, Schweregrad-Symbol; Klick öffnet das Modul) | Tagesbrief höchstens 4 Sätze, Rest aufklappbar; Wochenplan als 7-Spalten-Raster | voller Hinweistext im Tooltip; Datenstand und Verbindungen in `<details>` |
| Content | Balken „nach Kanal“ und „nach Projekttyp“ (Klick filtert) | Kanban mit farbiger Statuskante und Mini-Balken „Tage im Status“ (Gelbgrün ab Hängt-Grenze) | Kalender in `<details>` (Zustand bleibt); Region, Projekttyp, Notiz im Tooltip |
| Leads | Trichter Neu → Gewonnen (Klick filtert das Kanban), Verloren als Zahl | Verlauf „Neue Leads je Woche“ (5 KW, `charts.line`, Tabelle) | Karten: Organisation, Typ, Follow-up-Ampel; Kanal, Leistung, Region, Kontakte im Tooltip; Balken nach Kanal (Filter), Region, Landkreis (Top 7); neueste Leads als Tabelle in `<details>` |
| Ausschreibungen | Karte bleibt; rechts Ampel-Donut der offenen Fristen | Liste mit Restlaufzeit-Balken statt „in X Tagen“, Balken „Nach Landkreis“ | Behörde, Region, Portal, Status im Tooltip am Titel; Kartenerklärung als Tooltip; Nachbarländer in `<details>` |
| Events | Fortschrittsring je Event (Checkliste; bei der Messe Aufgabenfortschritt) | Mini-Kalender für Monate mit Events (Eventtage grün, Messetage mit Rahmen) | Bereichsbalken wie bisher |
| SEO | Traffic-Verlauf über `charts.line` oben | Positions-Histogramm (Top 3, 4–10, 11–30, > 30) | Keyword-Tabelle mit Position und Ampelpfeil; Region, URL, Prüfdatum im Tooltip |
| 90-Tage-Plan | Ring-Kacheln (Tage bis Messe, Pakete erledigt, offene Entscheidungen, Messgrößen ohne Ist) | Gantt bleibt; Fortschrittsbalken je Welle im Wellenfilter | Paket-Tabelle, Messgrößen, offene Fakten, Check-ins in `<details>`; Sprünge aus dem Zeitplan öffnen sie |

`lineChart()` ist aus `app-marketing2.js` entfernt (`app.lineChart` gibt es nicht mehr). Es hatte nur das SEO-Modul genutzt.

### Messung

`tools/textmass.mjs` zählt jetzt nur sichtbaren Text: Bei Auswahlfeldern zählt nur die gewählte Option, Text für
Screenreader zählt nicht. Mit `SEED=marketing` werden die Marketing-Module mit erfundenen Beispieldaten
(`e2e/fixtures-marketing.mjs`) statt im Leerzustand gemessen. Gemessen wurden der Stand vor dem Umbau
(Commit 8739e1f) und der Stand nach Phase 3 auf dieselbe Weise: `umbau/textmass-vorher.json` und `umbau/textmass-nachher.json`.

| Reiter | vorher | nachher | Änderung |
|---|---|---|---|
| Copilot | 1637 | 980 | −40 % |
| Content | 1024 | 584 | −43 % |
| Leads | 1719 | 871 | −49 % |
| Ausschreibungen | 1801 | 975 | −46 % |
| SEO | 859 | 460 | −46 % |
| 90-Tage-Plan | 10976 | 5481 | −50 % |
| Events | 291 | 397 | **+36 %** |
| Dashboard | 2103 | 1240 | −41 % |
| Aufgaben | 3125 | 1623 | −48 % |
| Fristen | 1348 | 368 | −73 % |
| Budget | 800 | 245 | −69 % |
| Ziele & KPIs | 499 | 253 | −49 % |
| Lead-Zähler | 568 | 282 | −50 % |

**Events:** Der Mini-Kalender (Abschnitt 5.11) fügt Tageszahlen hinzu, das Modul war vorher schon kurz. Die Zahl
steigt, die Event-Texte selbst sind nicht länger geworden. Weitere Kürzung ginge nur auf Kosten von Bereichsnamen
und nächstem Schritt.

**Widerspruch in der Arbeitsanweisung:** Blinder Fleck 1 verlangt „sichtbaren Text um ≥ 40 % reduzieren“. Die
Definition of Done nennt „nicht mehr als ~40 % des früheren Textes“, das wären −60 %. Umgesetzt ist −40 %, offen zur Entscheidung.

### Weitere Änderungen

- `charts.line` liegt in einem Scroll-Container (Mindestbreite 420 px), damit die Achsenschrift auf dem Handy lesbar bleibt.
- `app.chartPrev`, `app.chartKeep`, `app.chartLegend` (app-core) sind gemeinsame Helfer für „nur Geändertes animieren“ und Legenden.
- `localHints()` hat zusätzlich die Felder `s` (Kurzlabel) und `ic` (Symbol). Bestehende Felder sind unverändert.
- „Auf einen Blick“, Referenzen, Wissensbibliothek und Ablage stehen nicht in Abschnitt 5 und sind unverändert, bis auf das Standardbanner.

### Karte Ausschreibungen: Zahl je Bundesland in der Übersicht (Artefakt-Kommentar 07.10.2026)

Bei Zoom auf ganz Deutschland zeigt die Karte je Bundesland mit Ausschreibungen einen Kreis mit der Anzahl
(Anthrazit, grüne Kante, Größe nach Anzahl). Ab Zoomstufe 7 erscheinen stattdessen die einzelnen Standorte
(Pins, nahe beieinander gebündelt). Ein Klick oder Enter auf einen Kreis zoomt in das Land. Die Standorte
Lübben und Wittenburg bleiben immer sichtbar. Umgesetzt in `geomap.js` (Option `stateBubbles`), geprüft in
`karte.e2e.mjs`.

### CI-Korrektur

Aufklappbereiche, deren Zustand sich das Cockpit merkt (Budget-Eingaben, Content-Kalender, Paket-Tabelle), konnten
nach einem Neuzeichnen zugehen. Das `toggle`-Ereignis kommt asynchron und kann ein Neuzeichnen verpassen. Jetzt gilt
zusätzlich der Zustand im aktuellen Bild (`app.foldOpen`). Der Budget-Test war in CI deshalb einmal rot. Lokal liefen
danach 5 Durchläufe in Folge grün.

### Tests

- `npm run test:cockpit`: 40 bestanden
- `npm run test:cockpit:e2e`: 26 bestanden (neu: `marketing-visuell.e2e.mjs` mit 7 Tests)
- Keine Konsolenfehler in Hell, Dunkel und bei 390 px Breite.
