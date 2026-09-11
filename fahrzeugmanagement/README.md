# Fahrzeugmanagement – Fräsdienst-Service E. Feind GmbH

Leichtgewichtige Fuhrpark-App für kleine und mittlere Betriebe: Fahrten starten und
beenden, Fälligkeiten im Blick, Fahrzeuge, Fahrer, Buchungen und Wartung verwalten.

Ohne Cloud, ohne Lizenzkosten: Python + SQLite, läuft auf jedem PC oder kleinen
Server im Firmennetz. Bedienung im Browser oder als installierte App auf dem Handy
(PWA, optional als Android-APK). Komplett auf Deutsch.

## Funktionen

**Fahrer-Ansicht (mobil zuerst)**

| Bereich | Was die App kann |
|---|---|
| **Start** | Fahrerwahl („Ich bin …“), laufende Fahrt mit km-Feld und „Fahrt beenden“, „Fahrt starten“ mit Fahrzeugwahl (nur verfügbare), nächste geplante Buchung mit „Starten“, Top-Fälligkeiten, Fahrzeugstatus |
| **Fahrten** | Alle Fahrten als Karten mit Filter (aktiv, geplant, abgeschlossen), geplante Fahrt starten, Bearbeiten |
| **Fälligkeiten** | Überfällig / bald fällig: HU/AU, Wartung nach Datum oder km, Führerscheinkontrolle (halbjährlich); KPIs verfügbar/unterwegs/Werkstatt |

**Verwaltung**

| Bereich | Was die App kann |
|---|---|
| **Fahrzeuge** | Stammdaten, Kilometerstand, HU/AU-Termin, nächste Wartung (Datum/km), Status, Suche/Filter, CSV-Export |
| **Buchungen** | Fahrzeug + Fahrer + Zeitraum, Zweck/Ziel, km Start/Ende, Überschneidungsprüfung je Fahrzeug, automatische km-Fortschreibung, Fahrtenbuch als CSV |
| **Wartung** | Service-Historie mit Kosten und Werkstatt; schreibt optional HU-Termin und nächste Wartung direkt am Fahrzeug fort |
| **Fahrer** | Name, Abteilung, Führerscheinklasse, letzte Führerscheinkontrolle, Kontakt, aktiv/inaktiv |
| **App** | „Auf dem Handy installieren“, Version, Verbindungsstatus |

Auf dem Handy erscheinen die Verwaltungstabellen als gestapelte Karten, am PC als Tabellen.

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

Die Datenbank liegt als Datei `fahrzeuge.db` im Projektordner.

### Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `FAHRZEUG_DB` | Pfad zur SQLite-Datei (Standard: `fahrzeuge.db` im Projektordner) |
| `TWA_PACKAGE_NAME` | Package-ID der Android-App (Standard `de.feind.fuhrpark`), siehe Android-Doku |
| `TWA_SHA256_FINGERPRINT` | SHA-256-Fingerprint des APK-Signaturschlüssels, kommagetrennt bei mehreren |

## Installation auf dem Handy (PWA / Android-APK)

- **Ohne APK:** Adresse der App in Chrome (Android) öffnen → Menü → „App installieren“ bzw.
  „Zum Startbildschirm hinzufügen“. In der App selbst gibt es den Punkt unter
  Verwaltung → App. Voraussetzung: HTTPS (oder `localhost` zum Testen).
- **Als APK:** Anleitung in [`docs/ANDROID-APK.md`](docs/ANDROID-APK.md) (PWABuilder,
  ohne Android Studio). Braucht eine öffentlich gültige HTTPS-Adresse.
- Offline zeigt die App die zuletzt geladenen Daten an; Speichern braucht Verbindung.

Die Fahrerwahl auf der Startseite wird nur auf dem Gerät gemerkt und ist **keine Anmeldung**.

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
│   ├── main.py        # FastAPI-Routen (REST-API, Frontend, Manifest, Service Worker, Asset Links)
│   ├── models.py      # Pydantic-Schemas (Validierung)
│   ├── db.py          # SQLite-Schema und Verbindung
│   └── static/        # Frontend (HTML, CSS, Vanilla JS – keine Build-Tools)
│       ├── index.html, app.js, style.css
│       ├── manifest.webmanifest, sw.js   # PWA
│       └── icons/     # App-Icons (icon.svg als Quelle, PNG 192/512/maskable)
├── tests/             # pytest: test_api.py, test_pwa.py
├── seed_demo.py       # Demo-Daten
├── docs/ANDROID-APK.md, docs/PROJEKT-PROMPT.md
└── requirements.txt
```

## Ausbaustufen (nicht enthalten)

- Benutzeranmeldung und Rollen (Fuhrparkleitung / Fahrer)
- E-Mail- oder Push-Erinnerungen bei Fälligkeiten
- Tankbelege und Kosten je Fahrzeug, Auswertungen pro Monat
- Schadensmeldungen mit Fotos
- Kalenderansicht der Buchungen, Outlook-/ICS-Export
- Mehrmandantenfähigkeit / Standorte
