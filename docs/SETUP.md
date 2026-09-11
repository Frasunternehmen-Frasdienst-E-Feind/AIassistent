# Setup: Google Cloud, Zugriffe, Cron

Ziel: Der Dienst läuft ohne manuelle Klicks am 1. des Monats (Workflow 1) und jeden
Montag 09:00 Uhr (Workflow 3). Einmalig einzurichten: ca. 45 Minuten.

## 1. Google Cloud Projekt + Service-Account (ca. 15 Min.)

1. https://console.cloud.google.com → Projekt anlegen, z. B. `fd-seo-reporting`.
2. **APIs & Dienste → Bibliothek** → aktivieren:
   - *Google Search Console API*
   - *Google Analytics Data API*
3. **IAM & Verwaltung → Dienstkonten → Dienstkonto erstellen**
   - Name: `seo-reporting`
   - Keine Projektrolle nötig (der Zugriff wird in GSC/GA4 selbst vergeben).
4. Dienstkonto → **Schlüssel → Schlüssel hinzufügen → JSON** → Datei herunterladen und
   als `credentials/service-account.json` im Repo-Ordner ablegen (ist per `.gitignore` ausgeschlossen).
5. E-Mail-Adresse des Dienstkontos notieren (`seo-reporting@<projekt>.iam.gserviceaccount.com`).

Warum Service-Account statt OAuth-Client: Ein Cronjob hat keinen Browser für den
OAuth-Consent-Flow. Service-Account = Passwort-lose, unbeaufsichtigte Ausführung.

## 2. Zugriff in Search Console + GA4 vergeben (ca. 5 Min.)

- **Search Console**: https://search.google.com/search-console → Property `fraesdienst-feind.de`
  → Einstellungen → Nutzer und Berechtigungen → Nutzer hinzufügen → Service-Account-E-Mail,
  Berechtigung *Uneingeschränkt* (Lesen reicht, "Eingeschränkt" liefert ebenfalls Daten).
- **GA4**: Verwaltung → Property → Property-Zugriffsverwaltung → Nutzer hinzufügen →
  Service-Account-E-Mail, Rolle *Betrachter*.
- **GA4 Property-ID**: Verwaltung → Property-Einstellungen → Property-ID (nur Ziffern).

## 3. Lokal einrichten und prüfen (ca. 10 Min.)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp config.example.yaml config.yaml          # ga4_property_id + Cluster eintragen
python -m seo_reporting check-auth          # prüft Credentials + Zugriff beider APIs
python -m seo_reporting monthly --demo      # Beispielreport mit synthetischen Daten
python -m seo_reporting monthly --as-of 2026-09-01   # echter Report für August 2026
```

Ergebnis liegt in `output/monthly_2026-08-01_2026-08-31.md` (+ `.json`).

## 4. CRM-Export (ca. 5 Min. pro Monat, bis eine automatische Schnittstelle da ist)

Export als CSV/XLSX nach `data/crm/leads.csv` mit den Spalten
`created_at; source; status; value` (Spaltennamen in `config.yaml → crm` anpassbar).

**Datenschutz:** Nur diese vier Spalten exportieren. Keine Namen, Firmen, E-Mails oder
Telefonnummern. Der Ordner `data/crm/` ist per `.gitignore` vom Repo ausgeschlossen.
Bei Unsicherheit zur Verarbeitung von CRM-Daten: Bitte Rechtsabteilung prüfen.

## 5. Zeitplan einrichten (ca. 10 Min.)

**Variante A – Server/NAS/Rechner mit Cron (empfohlen, wenn der CRM-Export lokal liegt):**
`cron/crontab.example` in `crontab -e` übernehmen, Pfad anpassen.
Beide Läufe schreiben nach `output/` und verschicken mit `--email` den Report.

**Variante B – GitHub Actions (kein eigener Server nötig):**
Repository → Settings → Secrets and variables → Actions:

| Secret | Inhalt |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | kompletter Inhalt der Service-Account-JSON |
| `GA4_PROPERTY_ID` | GA4 Property-ID |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `REPORT_EMAIL_FROM`, `REPORT_EMAIL_TO` | optional für Mailversand |

Die Workflows `.github/workflows/seo-monthly.yml` und `seo-weekly.yml` laufen dann
automatisch (1. des Monats 08:00 MESZ, Montag 09:00 MESZ) und legen Report + JSON als
Artifact ab. Einschränkung: Der CRM-Export ist dort nicht verfügbar, der Report vermerkt
das unter "Datenhinweise". Winterzeit: Läufe verschieben sich um eine Stunde nach vorn
(GitHub-Cron läuft in UTC).

## 6. E-Mail-Versand

`config.yaml → email` ausfüllen (Host, Port, Absender, Empfänger), Passwort ausschließlich
per `SMTP_PASSWORD`-Umgebungsvariable. Test:

```bash
SMTP_PASSWORD=... python -m seo_reporting monthly --demo --email
```

## 7. Bekannte Einschränkungen

- **Search Console liefert Daten mit 2–3 Tagen Verzögerung.** Der Lauf am 1. enthält
  die letzten Tage des Vormonats noch nicht; der Report weist darauf hin. Für vollständige
  Zahlen den optionalen Nachlauf am 4. aktivieren (siehe `cron/crontab.example`).
- Search Console anonymisiert seltene Suchanfragen. Die Summe der Query-Klicks liegt daher
  unter den Gesamtklicks; die Cluster-Werte bilden nur den sichtbaren Teil ab.
- GA4 `keyEvents` zählt alle als Key Event markierten Ereignisse. Soll nur ein Ereignis
  (z. B. `anfrage_gesendet`) zählen, in `seo_reporting/sources/ga4.py` das Metrik-Set
  auf `keyEvents:anfrage_gesendet` ändern.
