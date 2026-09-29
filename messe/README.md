# Messe-Projektdokumente – mehrsprachiger Generator

Erzeugt ausfüllbare PDF-Formulare für das Messeprojekt **InfraTech 2027 (Rotterdam Ahoy,
Stand 5.209)** in **NL, DE, EN, PL** – im Corporate Design aus
`branding/feind-ci.tokens.json`.

**NL (Niederländisch) ist reguläre Messesprache** und wird – wie DE, EN und PL – bei jedem
Lauf ohne `--langs` standardmäßig mit erzeugt (Reihenfolge: nl, de, en, pl).

Jede Position hat: Kontrollkästchen (erledigt) · Status-Dropdown (Vorbelegung „Offen“) ·
festes Notizfeld (Freitext + Link, max. 250 Zeichen). Zusätzlich: Steuerungsleiste mit den
kritischen Blockern und eine Sektion „Blinde Flecken“.

## Nutzung

Aktuell verfügbare Dokumenttypen: **`todo`** (ToDo-Brennglas), **`agenda`** (Standdienst- & Ablaufplan), **`followup`** (Lead-Nachfass- & Nachbereitungsbogen).

```bash
# alle Sprachen (nl, de, en, pl), Dokument "todo":
python messe/generate.py

# Ablaufplan (agenda) in allen Sprachen:
python messe/generate.py --doc agenda

# nur einzelne Sprachen:
python messe/generate.py --langs de,en

# Zielordner / anderes CI-Token-File:
python messe/generate.py --out ~/Downloads
```

Die PDFs landen unter `messe/output/` (nicht versioniert).

Voraussetzungen: `pip install reportlab` sowie eine Unicode-TTF für korrekte Sonderzeichen
(Liberation Sans **oder** DejaVu Sans). Wird keine gefunden, fällt der Generator auf
Helvetica zurück – dann sind polnische Zeichen im **gedruckten** Text evtl. nicht korrekt.
Eigenen Font-Ordner erzwingen: Umgebungsvariable `FEIND_FONT_DIR`.

## Aufbau

```
messe/
  generate.py            CLI (Sprachen, Dokument, Zielordner)
  render.py              Zeichen-Engine (Layout, Formularfelder, CI)
  content/
    todo/                ein Dokument = ein Ordner
      nl.json de.json en.json pl.json
  data/
    team.example.json    Vorlage (committet, ohne echte Namen)
    team.local.json      LOKAL, echte Namen – NICHT versioniert
  output/                erzeugte PDFs – NICHT versioniert
```

## Neues Dokument ergänzen

1. Ordner `messe/content/<key>/` anlegen und je Sprache eine `<lang>.json` mit demselben
   Aufbau wie `content/todo/*.json` (Schlüssel: `title`, `event`, `sections`, `blind`, …).
2. Erzeugen: `python messe/generate.py --doc <key>`.

Beispiele für weitere Dokumente: `agenda` (Standdienst-/Ablaufplan), `followup`
(Lead-Nachfassbogen), `briefing` (Dienstleister-Briefing).

## Datenschutz (verbindlich)

- **Keine personenbezogenen Daten Dritter im Repository.** Namen, Kontakte o. Ä. werden als
  Platzhalter `{{SCHLUESSEL}}` in den Inhaltsdateien geführt und erst beim Erzeugen aus
  `data/team.local.json` ersetzt. Diese Datei ist per `.gitignore` ausgeschlossen.
- Erzeugte PDFs können personenbezogene Daten enthalten → `messe/output/` ist ebenfalls
  ausgeschlossen. Fertige Dokumente sind **intern/vertraulich**, nicht an Externe/Aussteller
  weitergeben.
- Bei vertraglichen, steuerlichen oder arbeitsrechtlichen Fragen gilt: **bitte
  Rechtsabteilung prüfen.**
