# Fahrzeugmanagement – Fräsdienst-Service E. Feind GmbH

Leichtgewichtige Fuhrpark-App für kleine und mittlere Betriebe: Fahrzeuge, Fahrer,
Buchungen (mit Fahrtenbuch), Wartung/Service und ein Dashboard mit Fälligkeiten.

Ohne Cloud, ohne Lizenzkosten: Python + SQLite, läuft auf jedem PC oder kleinen
Server im Firmennetz. Bedienung komplett im Browser, auf Deutsch.

## Funktionen (MVP)

| Bereich | Was die App kann |
|---|---|
| **Dashboard** | KPIs (Bestand, verfügbar, unterwegs, Werkstatt), Fälligkeiten: HU/AU, Wartung nach Datum oder km, Führerscheinkontrolle (halbjährlich), Servicekosten im laufenden Jahr |
| **Fahrzeuge** | Stammdaten, Kilometerstand, HU/AU-Termin, nächste Wartung (Datum/km), Status, Suche/Filter, CSV-Export |
| **Buchungen** | Fahrzeug + Fahrer + Zeitraum, Zweck/Ziel, km Start/Ende, Überschneidungsprüfung je Fahrzeug, automatische km-Fortschreibung, Fahrtenbuch als CSV |
| **Wartung** | Service-Historie mit Kosten und Werkstatt; schreibt optional HU-Termin und nächste Wartung direkt am Fahrzeug fort |
| **Fahrer** | Name, Abteilung, Führerscheinklasse, letzte Führerscheinkontrolle, Kontakt, aktiv/inaktiv |

## Schnellstart

Voraussetzung: Python 3.11 oder neuer.

```bash
cd fahrzeugmanagement
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# optional: Demo-Daten zum Ausprobieren
python seed_demo.py

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Dann im Browser öffnen: <http://localhost:8000>
API-Dokumentation (Swagger): <http://localhost:8000/docs>

Die Datenbank liegt als Datei `fahrzeuge.db` im Projektordner. Anderer Speicherort
über die Umgebungsvariable `FAHRZEUG_DB=/pfad/zur/datei.db`.

## Tests

```bash
python -m pytest
```

## Betrieb im Firmennetz (Empfehlung)

- Auf einem kleinen Server oder einem Büro-PC dauerhaft starten (z. B. als
  Windows-Dienst via NSSM oder als systemd-Unit unter Linux).
- Zugriff nur im internen Netz oder per VPN. Die App hat **keine eigene
  Benutzeranmeldung**, dafür ist bei Bedarf ein Reverse-Proxy mit Login
  (z. B. nginx + Basic Auth oder SSO) vorzuschalten.
- Backup: die Datei `fahrzeuge.db` regelmäßig sichern.

## Datenschutz

Fahrerdaten sind personenbezogene Daten. Es werden nur dienstlich notwendige Felder
erfasst (Name, Abteilung, Führerscheinklasse, Kontrollnachweis, dienstliche
Kontaktdaten). Vor Produktivbetrieb: Verarbeitungsverzeichnis ergänzen,
Mitarbeitende informieren. Bei Fragen zur Rechtsgrundlage der
Führerscheinkontrolle und des Fahrtenbuchs: Bitte Rechtsabteilung prüfen.

## Technischer Aufbau

```
fahrzeugmanagement/
├── app/
│   ├── main.py        # FastAPI-Routen (REST-API + Auslieferung des Frontends)
│   ├── models.py      # Pydantic-Schemas (Validierung)
│   ├── db.py          # SQLite-Schema und Verbindung
│   └── static/        # Frontend (HTML, CSS, Vanilla JS – keine Build-Tools)
├── tests/test_api.py  # API-Tests (pytest)
├── seed_demo.py       # Demo-Daten
├── docs/PROJEKT-PROMPT.md
└── requirements.txt
```

## Ausbaustufen (nicht im MVP)

- Benutzeranmeldung und Rollen (Fuhrparkleitung / Fahrer)
- E-Mail-Erinnerungen bei Fälligkeiten
- Tankbelege und Kosten je Fahrzeug, Auswertungen pro Monat
- Schadensmeldungen mit Fotos
- Kalenderansicht der Buchungen, Outlook-/ICS-Export
- Mehrmandantenfähigkeit / Standorte
