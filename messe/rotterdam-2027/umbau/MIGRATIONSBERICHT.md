# Migrationsbericht: Feind Cockpit „textlastig zu visuell“

Quelle der Arbeit: `feind-cockpit-v3.html` (Stand des Artefakts „Feind Cockpit“ TfuzbG vom 07.10.2026).
Farbregeln: `branding/farbsystem.md` (Version 1.1) und `branding/feind-ci.tokens.json`.

| Phase | Inhalt | Stand |
|---|---|---|
| 0 | Führende Quelle, Regression Kachelanbieter, Text-Ausgangsmessung | erledigt |
| 1 | `charts.js`, Diagramm-Tokens, Referenzmodul Lead-Zähler, Themenbanner-Muster | **wartet auf Freigabe** |
| 2 | InfraTech: Dashboard, Aufgaben, Fristen, Budget, KPI; Meeting-Modus; Exporte | offen |
| 3 | Marketing: Copilot, Content, Leads, Ausschreibungen, Events, SEO; `lineChart()` → `charts.line()` | offen |
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

### Offene Entscheidungen

1. Freigabe des Musters (Ringe, Balken, Banner, Animation) für die Fläche in Phase 2 und 3.
2. Veröffentlichung des Stands in das Artefakt „Feind Cockpit“ (TfuzbG): jetzt oder gesammelt nach Phase 2.
3. Info-Status in Tiefblau `#2c5a7a` steht im Farbsystem, ist aber neu im Cockpit. Bisher ist er Anthrazit.
