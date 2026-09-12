# AIassistent – SEO-/Lead-Reporting fraesdienst-feind.de

Wiederholbarer Dienst, der Google Search Console, GA4 und einen CRM-Export zusammenzieht,
MoM-/YoY-Vergleiche berechnet, Keyword-Cluster-Bewegungen erkennt und einen Markdown- plus
JSON-Report schreibt. Der Markdown-Report ist die Übergabe an die Client-Ready-Fassung (Workflow 2).

| Workflow | Befehl | Zeitplan |
|---|---|---|
| 1 Monatsreport | `python -m seo_reporting monthly` | 1. des Monats 08:00 |
| 3 Wochen-Check | `python -m seo_reporting weekly` | Montag 09:00 |

## Schnellstart

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m seo_reporting monthly --demo --stdout     # läuft sofort, ohne Zugangsdaten
```

Echtbetrieb: `docs/SETUP.md` (Google Cloud, Zugriffe, Cron/GitHub Actions).
Technische Details (Endpunkte, Scopes, JSON-Struktur): `docs/SPEC.md`.

## Befehle

```bash
python -m seo_reporting check-auth                 # Credentials + API-Zugriff prüfen
python -m seo_reporting monthly [--as-of 2026-09-01] [--email] [--stdout] [--demo]
python -m seo_reporting weekly  [--as-of 2026-09-07] [--email] [--stdout] [--demo]
```

Ausgabe: `output/<workflow>_<start>_<end>.md` und `.json`.

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
config.example.yaml Vorlage → config.yaml
cron/               Crontab-Beispiel
.github/workflows/  Zeitgesteuerte Läufe + Tests
docs/               SETUP.md, SPEC.md
tests/              pytest
```

## Tests

```bash
pip install -r requirements-dev.txt && pytest -q
```

Datenschutz: `credentials/`, `config.yaml` und `data/crm/` sind vom Repo ausgeschlossen.
Der CRM-Export enthält nur Datum, Quelle, Status und Wert.
