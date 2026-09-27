# Technische Spezifikation – Daten-Anbindung SEO-/Lead-Reporting

Stand: 2026-09-11 · Paket `seo_reporting` · Python 3.11

## 1. Zweck und Workflows

| Workflow | Auslöser | Zeitraum | Vergleich |
|---|---|---|---|
| 1 Monatsreport | 1. des Monats 08:00 | Vormonat | MoM (Vor-Vormonat), YoY (Vorjahresmonat) |
| 2 Client-Ready-Fassung | manuell im Chat | – | nimmt `.md` + `.json` aus Workflow 1/3 als Input |
| 3 Wochen-Check | Montag 09:00 | letzte volle Woche Mo–So | WoW (Vorwoche); YoY optional (52 Wochen, wochentagsgleich) |

## 2. Quellen, Endpunkte, Scopes

### Google Search Console – Search Analytics API
- Endpunkt: `POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`
  (Python: `googleapiclient.discovery.build("searchconsole", "v1")`)
- Scope: `https://www.googleapis.com/auth/webmasters.readonly`
- Abfragen pro Zeitraum (jeweils `dataState=final`, Pagination 25 000 Zeilen):
  1. ohne Dimension → Totals (Klicks, Impressionen, CTR, Position)
  2. `dimensions=["query"]` → alle sichtbaren Suchanfragen
  3. `dimensions=["page"]` → Seiten
  4. `dimensions=["date"]` → letzter Tag mit Daten (Verzögerungs-Hinweis)
- Property: `sc-domain:fraesdienst-feind.de` (Domain-Property) oder `https://www.fraesdienst-feind.de/`

### Google Analytics 4 – Data API v1beta
- Endpunkt: `POST https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport`
  (Python: `google.analytics.data_v1beta.BetaAnalyticsDataClient.run_report`)
- Scope: `https://www.googleapis.com/auth/analytics.readonly`
- Metriken: `sessions`, `engagedSessions`, `totalUsers`, `keyEvents`
- Dimensionen: keine (Totals), `sessionDefaultChannelGroup` (Kanäle), `landingPagePlusQueryString` (Top 100)

### CRM-Export (Datei)
- CSV (`;` oder `,`, automatisch erkannt, UTF-8/UTF-8-BOM) oder XLSX
- Pflichtspalten (Namen konfigurierbar): `created_at`, `source`, `status`; optional `value`
- Datumsformat: automatisch mit Tag-zuerst (`03.08.2026`), alternativ `date_format`
- „Gewonnen“ = Status in `won_statuses` (Groß-/Kleinschreibung egal)

### Authentifizierung
- Service-Account (JSON-Key), beide Scopes; Zugriff wird in GSC (Nutzer) und GA4 (Betrachter) vergeben
- Reihenfolge: ENV `GOOGLE_SERVICE_ACCOUNT_JSON` (Inhalt) → `GOOGLE_APPLICATION_CREDENTIALS` / `credentials_file` (Pfad)

## 3. Verarbeitung

1. **Zeiträume** (`periods.py`): `periods_for(workflow, as_of)` → `current`, `previous`, `yoy`
2. **Marke vs. Nicht-Marke** (`analysis/brand.py`): Normalisierung (Kleinschreibung, ä→ae, Sonderzeichen raus),
   Substring-Match gegen `brand_terms`, auch ohne Leerzeichen (`fraesdienstfeind`)
3. **Cluster** (`analysis/clusters.py`): Reihenfolge Marke → konfigurierte Cluster (erste Übereinstimmung) → „Sonstige“.
   Konfigurierte Cluster (Stand 09/2026): Regional, Zielgruppen, Problembezogen, Spezialverfahren, Flächengröße, Service, Hauptleistungen.
   Pro Cluster: Klicks, Impressionen, CTR, impressions-gewichtete Ø Position, Anzahl Queries, Top-Queries
4. **Deltas** (`analysis/metrics.py`): `{current, previous, abs, pct}`; `pct = null` bei Vorwert 0
5. **Bewegungs-Erkennung** (`detect_movements`), nur Cluster mit ≥ `min_clicks` (10) in einem der Zeiträume:
   - Klicks: |Δ %| ≥ 15 % (Monat) bzw. ≥ 20 % (Woche); *hoch* ab doppelter Schwelle und ≥ 30 Klicks
   - Ø Position: |Δ| ≥ 1,0; *hoch* ab 2,0; Verbesserung = kleinere Position = `direction: up`
   - Basis: MoM/WoW immer, YoY zusätzlich im Monatsreport
6. **Query-Mover**: Top-15 Gewinner/Verlierer nach absoluter Klick-Änderung

## 4. Output-Datenstruktur (JSON)

Datei: `output/{monthly|weekly}_{start}_{end}.json`, parallel `.md` mit identischem Namen.

```jsonc
{
  "meta": {
    "tool": "seo_reporting 0.1.0", "workflow": "monthly", "site": "sc-domain:fraesdienst-feind.de",
    "generated_at": "2026-09-01T06:00:12+00:00",
    "periods": { "current": {"label","start","end","days"}, "previous": {...}, "yoy": {...}, "previous_label": "MoM" },
    "thresholds": {...},
    "data_notes": ["Search Console: Daten liegen nur bis 2026-08-29 vor ..."]
  },
  "movements": [
    { "cluster": "Werkstoffe", "basis": "MoM", "metric": "clicks", "direction": "down",
      "current": 39, "previous": 138, "delta_pct": -71.7, "severity": "hoch" },
    { "cluster": "Regional", "basis": "MoM", "metric": "position", "direction": "up",
      "current": 6.8, "previous": 9.3, "delta_pct": null, "delta_abs": -2.55, "severity": "hoch" }
  ],
  "gsc": {
    "totals":      { "current": {clicks, impressions, ctr, position}, "MoM": {clicks: {current, previous, abs, pct}, ...}, "YoY": {...} | null },
    "brand_split": { "current": {"brand": {clicks, impressions, ctr}, "non_brand": {...}}, "previous": {...}, "yoy": {...} | null },
    "clusters":    { "current": [ {name, clicks, impressions, ctr, position, query_count, top_queries[]} ],
                     "MoM": [ {name, clicks: Δ, impressions: Δ, ctr: Δ, position: Δ, query_count: Δ} ], "YoY": [...] | null },
    "query_movers": { "winners": [ {query, clicks: Δ, position: Δ} ], "losers": [...] },
    "top_queries": [ {key, clicks, impressions, ctr, position} ],
    "top_pages":   [ {key, clicks, impressions, ctr, position} ],
    "last_data_date": "2026-08-29"
  },
  "ga4": {
    "totals":   { "current": {sessions, engaged_sessions, total_users, key_events}, "MoM": {…Δ}, "YoY": {…Δ} | null },
    "channels": [ { "channel": "Organic Search", "current": {...}, "MoM": {…Δ} | null } ],
    "landing_pages": [ {key, sessions, engaged_sessions, total_users, key_events} ]
  },
  "crm": {
    "current": { "available": true, "note": "...", "leads": 19, "won": 4, "value": 98365.1,
                 "by_source": [ {source, leads, won, value} ] },
    "MoM": { "leads": Δ, "won": Δ, "value": Δ } | null,
    "YoY": {...} | null
  }
}
```

Δ steht überall für `{ "current", "previous", "abs", "pct" }`. Im Wochen-Check heißt der
Vergleichs-Schlüssel `WoW` statt `MoM`; `meta.periods.previous_label` nennt ihn.

## 5. Übergabe an Workflow 2 (Client-Ready-Fassung im Chat)

Die `.md`-Datei ist bereits so gegliedert, dass sie 1:1 in den Chat kopiert werden kann:
Auto-Highlights → Search Console → GA4 → CRM. Für tiefergehende Auswertungen die `.json`
mitgeben (enthält Top-Queries je Cluster und alle Deltas).

## 6. Konfiguration (config.yaml) und ENV-Überschreibungen

Pfad zur Konfigurationsdatei: `--config` → ENV `SEO_REPORTING_CONFIG` → `./config.yaml` → `./config.example.yaml`.

| Schlüssel | ENV | Zweck |
|---|---|---|
| `site_url` | `GSC_SITE_URL` | GSC-Property |
| `ga4_property_id` | `GA4_PROPERTY_ID` | GA4 Property |
| `credentials_file` | `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_SERVICE_ACCOUNT_JSON` | Auth |
| `crm.export_path` | `CRM_EXPORT_PATH` | CRM-Datei |
| `output_dir` | `REPORT_OUTPUT_DIR` | Ausgabeordner |
| `email.*` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `REPORT_EMAIL_FROM`, `REPORT_EMAIL_TO` | Versand |

## 7. Offene Punkte / Erweiterungen

- Cluster-Liste nach echten Search-Console-Daten nachschärfen (Quelle aktuell: Notion Marketing-Scan/-Audit 08/2026).
- CRM-Anbindung per API statt Datei-Export, sobald das CRM feststeht.
- Optional: Mehrere GA4-Key-Events getrennt ausweisen (`keyEvents:<event_name>`).
- Optional: Historie der JSON-Reports für Trendlinien über > 2 Zeiträume.
