# AIassistent – SEO-/Lead-Reporting fraesdienst-feind.de

Wiederholbarer Dienst, der Google Search Console, GA4 und einen CRM-Export zusammenzieht,
MoM-/YoY-Vergleiche berechnet, Keyword-Cluster-Bewegungen erkennt und einen Markdown- plus
JSON-Report schreibt. Der Markdown-Report ist die Übergabe an die Client-Ready-Fassung (Workflow 2).

| Workflow | Befehl | Zeitplan |
|---|---|---|
| 1 Monatsreport | `seo-report monthly` | 1. des Monats 08:00 |
| 3 Wochen-Check | `seo-report weekly` | Montag 09:00 |

## Schnellstart

```bash
python3 -m venv .venv && source .venv/bin/activate      # Windows: python -m venv .venv && .venv\Scripts\activate
pip install -e .
seo-report monthly --demo --stdout                      # läuft sofort, ohne Zugangsdaten
```

`pip install -e .` installiert das Paket samt Abhängigkeiten und den Befehl `seo-report`,
der aus jedem Ordner funktioniert (`python -m seo_reporting` geht weiterhin, dann aber nur
aus dem Repo-Ordner).

Echtbetrieb: `docs/SETUP.md` (Google Cloud, Zugriffe, Cron/GitHub Actions).
Technische Details (Endpunkte, Scopes, JSON-Struktur): `docs/SPEC.md`.

## Befehle

```bash
seo-report check-auth                 # Credentials + API-Zugriff prüfen
seo-report monthly [--as-of 2026-09-01] [--email] [--stdout] [--demo]
seo-report weekly  [--as-of 2026-09-07] [--email] [--stdout] [--demo]
```

Ausgabe: `output/<workflow>_<start>_<end>.md` und `.json` im aktuellen Ordner.

Konfiguration wird in dieser Reihenfolge gesucht: `--config` → Umgebungsvariable
`SEO_REPORTING_CONFIG` → `./config.yaml` → `./config.example.yaml`. Relative Pfade in der
Konfiguration (Credentials, CRM-Export, Ausgabeordner) gelten ab dem aktuellen Ordner.

## Struktur

```
seo_reporting/
  cli.py            Kommandozeile
  config.py         config.yaml + ENV
  auth.py           Service-Account-Credentials
  periods.py        Monats-/Wochen-Zeiträume, MoM/WoW/YoY
  sources/          gsc.py, ga4.py, crm.py, demo.py, live.py
  analysis/         brand.py (Marke), clusters.py (Cluster + Bewegungen), metrics.py (Deltas)
  report/           build.py (JSON), markdown.py (Report), email.py (SMTP)
pyproject.toml      Paket-Definition, Befehl seo-report
config.example.yaml Vorlage → config.yaml
cron/               Crontab-Beispiel
.github/workflows/  Zeitgesteuerte Läufe + Tests
docs/               SETUP.md, SPEC.md
tests/              pytest
```

## Tests

```bash
pip install -e ".[dev]" && pytest -q
```

Datenschutz: `credentials/`, `config.yaml` und `data/crm/` sind vom Repo ausgeschlossen.
Der CRM-Export enthält nur Datum, Quelle, Status und Wert.
