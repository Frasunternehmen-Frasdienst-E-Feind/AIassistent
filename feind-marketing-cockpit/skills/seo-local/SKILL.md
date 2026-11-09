---
name: seo-local
description: Lokale SEO für fraesdienst-feind.de – übernimmt Search-Console- und GA4-Werte aus dem vorhandenen Tool seo-report (output/*.json) in seo_keywords und seo_traffic, verfolgt regionale Keywords wie „Kaltfräsen Brandenburg“ oder „Fräsarbeiten Lübben“ und erstellt eine Content-Gap-Analyse Leistung mal Region in seo_gaps. Greift bei „SEO-Stand“, „Rankings prüfen“, „Keyword-Positionen“, „SEO-Report ins Cockpit“, „Traffic des Monats“, „Content-Lücken“, „lokale Keywords“ oder „seo-report übernehmen“.
---

# SEO lokal – Keywords, Traffic, Content-Lücken

## Zweck

Du bringst die SEO-Daten von fraesdienst-feind.de in das Marketing Cockpit und leitest
daraus regionale Content-Lücken ab. Zahlen stammen ausschließlich aus dem Repository-Tool
`seo-report` (Google Search Console und GA4) – du schätzt keine Werte.
Verbindliches Datenmodell: `kontext/datenmodell.md`.

Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`

## Eingaben und Datenquellen

* `seo-report monthly` bzw. `seo-report weekly` (siehe `README.md`, Struktur in `docs/SPEC.md`,
  Abschnitt 4). Ausgabe: `output/<workflow>_<start>_<end>.json` und `.md`.
  `--demo` liefert Beispieldaten – diese **nie** in `db` schreiben.
* Relevante JSON-Pfade:
  * `meta.workflow`, `meta.periods.current.start/end`, `meta.generated_at`, `meta.data_notes`
  * `gsc.totals.current` → `{clicks, impressions, ctr, position}`
  * `gsc.top_queries[]` → `{key, clicks, impressions, ctr, position}` (Top 15, `top_n`)
  * `gsc.top_pages[]` → `{key, clicks, impressions, ctr, position}`
  * `gsc.query_movers.winners/losers[]` → `{query, clicks: Δ, position: Δ}`
  * `gsc.clusters.current[]` → Cluster „Regional“ mit `top_queries`
  * `ga4.totals.current.sessions`
* Leistungen und Einsatzregionen nur aus `kontext/unternehmen.md` (wird parallel erstellt)
  und `settings/general.regions`. Fehlt etwas, frage David.

## Ziel-Keywords (Startliste, von David zu bestätigen)

`Kaltfräsen Brandenburg`, `Straßenfräsen Spreewald`, `Asphaltfräsen Wittenburg`,
`Fräsarbeiten Lübben`, ergänzt um Kombinationen Leistung × Ort aus `kontext/unternehmen.md`
(z. B. Asphaltfräsen, Betonfräsen, Feinfräsen × Landkreis/Stadt). Ob ein Keyword
Suchvolumen hat, belegst du nur mit GSC-Impressionen oder einem genannten Tool – nicht schätzen.

## Arbeitsablauf A – seo-report übernehmen

1. Prüfe, ob eine aktuelle JSON in `output/` liegt; sonst bitte David, `seo-report monthly`
   (oder `weekly`) auszuführen, oder führe es aus, wenn Zugangsdaten eingerichtet sind
   (`seo-report check-auth`). Zugangsdaten nie ausgeben oder kopieren.
2. Lies die JSON vollständig. Enthält `meta.data_notes` Hinweise (unvollständige Daten,
   GA4 ohne Zugriff), übernimm sie in die Ausgabe an David.
3. **seo_traffic** (nur `monthly`): Dokument `seo_traffic/<JJJJ-MM>` des Berichtsmonats
   (`meta.periods.current.start`):
   ```json
   { "month": "2026-08", "clicks": <gsc.totals.current.clicks>,
     "impressions": <...impressions>, "ctr": <...ctr>, "avgPosition": <...position>,
     "sessions": <ga4.totals.current.sessions, weglassen wenn 0 und GA4-Hinweis>,
     "source": "output/monthly_2026-08-01_2026-08-31.json" }
   ```
   Wochenberichte schreiben kein `seo_traffic`.
4. **seo_keywords**: je Ziel-Keyword und je regional relevanter Query aus
   `gsc.top_queries` bzw. `gsc.clusters.current[name="Regional"].top_queries`:
   * `keyword` = Query, `position`, `clicks`, `impressions` aus dem JSON,
   * `previousPosition` = bisheriger `position`-Wert des Dokuments in `db` (vorher per
     `ArtifactData list` auf `seo_keywords` lesen); gibt es keinen, Feld weglassen,
   * `region` aus dem Ortsbestandteil der Query (Zuordnung zu `settings/general.regions`),
   * `url`: Das JSON enthält keine Query-zu-Seite-Zuordnung. Setze `url` nur, wenn sie
     aus einer separaten GSC-Abfrage (Dimension query + page) belegt ist, sonst
     `"nicht ermittelt"` und als Rückfrage notieren,
   * `checkedAt` = `meta.periods.current.end`, `source` = JSON-Dateipfad.
   ID: Keyword kleingeschrieben mit Bindestrich, Umlaute ausgeschrieben
   (`kaltfraesen-brandenburg`). Ziel-Keywords ohne GSC-Daten nicht mit 0 anlegen, sondern
   als „keine Impressionen im Zeitraum“ melden.
5. Schreibe `seo_traffic` und `seo_keywords` in einem `ArtifactData batch`
   (`set` für neue IDs, `update` für bestehende).
6. `ArtifactData update` auf `meta/sync`, Feld `seo: { at, source: <JSON-Pfad> }`.

## Arbeitsablauf B – Content-Gap-Analyse (Leistung × Region)

1. Baue die Matrix: Zeilen = Leistungen aus `kontext/unternehmen.md`, Spalten = Regionen
   aus `settings/general.regions` (bei Bedarf Landkreise/Städte, die David nennt).
2. Belege je Zelle:
   * Gibt es eine Seite? → `gsc.top_pages`, Sitemap oder Website-Inhalt von
     fraesdienst-feind.de (Seite nennen).
   * Gibt es Nachfrage? → Impressionen passender Queries im JSON.
   * Rankt die Seite? → Position ≤ 10 gilt als sichtbar.
   * Gibt es Content in Arbeit? → `ArtifactData query` auf `content` (Region, projectType).
3. Lücke = Nachfrage vorhanden (Impressionen) und keine passende Seite oder Position > 10,
   oder Leistung in Region laut Unternehmenskontext angeboten, aber ohne Seite.
4. Schreibe je Lücke `seo_gaps/<id>` mit `topic, service, region, reason, priority, source`:
   * `priority: "hoch"` – Impressionen vorhanden, Position > 10, Kernleistung,
   * `"mittel"` – Nachfrage gering oder Seite vorhanden, aber schwach,
   * `"niedrig"` – nur aus Unternehmenskontext abgeleitet, keine Nachfragedaten.
   `reason` nennt die Belege, `source` die JSON-Datei bzw. geprüfte Seite.
5. Schreiben per `ArtifactData batch`; geschlossene Lücken (Seite rankt inzwischen)
   meldest du David zur Entfernung.
6. Übergib hoch priorisierte Lücken als Themenideen an den Skill content-pipeline.

## Qualitäts- und Compliance-Checks

* Nur Werte aus der JSON-Datei; keine gerundeten Schätzungen, keine Demo-Daten.
* Datenstand angeben (`meta.periods.current`, `gsc.last_data_date`).
* Keine personenbezogenen Daten; GA4 liefert nur Summen, das bleibt so.
* Markenanfragen (Cluster „Marke“) sind keine lokalen Ranking-Belege.
* Aussagen über Wettbewerber nur mit Quelle (URL, Datum).
* Rechtliche Fragen (z. B. Tracking-Einwilligung, Cookie-Banner): „Bitte Rechtsabteilung prüfen.“

## Ausgabeformat

```
SEO – Zeitraum <start> bis <end> (Quelle: output/<datei>.json)
Traffic: Klicks, Impressionen, CTR, Ø Position, Sitzungen (+ Veränderung MoM laut JSON)
Keywords: | Keyword | Region | Position | vorher | Klicks | Impressionen |
Content-Lücken: | Priorität | Leistung | Region | Begründung |
Datenhinweise: <meta.data_notes>
```

## Grenzen

* Keine Änderungen an `seo_reporting/` oder an `config.yaml` – bei Bedarf Vorschlag an David.
* Keine Rankings aus manuellen Google-Suchen ableiten (personalisiert, nicht reproduzierbar).
* Keine Veröffentlichung von Seiten; Umsetzung läuft über content-pipeline und Website-Pflege.
