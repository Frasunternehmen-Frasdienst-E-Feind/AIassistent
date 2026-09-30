# feind-vergabe-mcp (Prototyp)

MCP-Server, der öffentliche Ausschreibungen für das Feind Marketing Cockpit **nur liest**:
TED (EU, API v3, anonym) und service.bund.de (RSS). Ins Cockpit schreibt allein Claude,
und erst nach Freigabe durch David. Konzept: `../../konzepte/mcp-feind-vergabe.md`.

## Tools

| Tool | Zweck |
|---|---|
| `vergabe_search_ted` | TED nach CPV, NUTS-Region, Zeitraum; Standard: CPV-Arbeitsliste, ganz Deutschland, letzte 14 Tage, nur laufende Ausschreibungen mit offener Frist |
| `vergabe_fetch_bund` | service.bund.de-Feed, Filter über Titel-Stichworte (Feed ohne CPV) |
| `vergabe_get_notice` | Einzelne TED-Bekanntmachung per Nummer |
| `vergabe_prepare_tenders` | Treffer → Entwürfe `tenders/<id>`, getrennt nach neu / Frist geändert / Dublette (rechnet nur) |
| `vergabe_source_status` | Letzter Abruf je Quelle |

Datenschutz: E-Mail-Adressen und Telefonnummern werden beim Einlesen entfernt, Vergabestellen
nur als Organisation. Keine Vergabeunterlagen.

## Installation

```bash
cd mcp/feind-vergabe
npm install
npm run build
npm test          # 10 Tests, offline mit festen Beispieldaten und MCP-Protokolltest
```

Das Plugin meldet den Server über `.mcp.json` an (Transport stdio). Hinter einem Firmen-Proxy
Node mit `NODE_USE_ENV_PROXY=1` starten (Node ≥ 22.21), sonst schlägt der Abruf mit „fetch failed“ fehl.

## Offene Punkte

* Nutzungsbedingungen TED und service.bund.de: **Bitte Rechtsabteilung prüfen** (vor Live-Betrieb).
* CPV-Arbeitsliste vom Vertrieb bestätigen lassen.
* Ausbaustufe 2: Tagesexport von oeffentlichevergabe.de (eForms/OCDS) für Unterschwellen- und Landesvergaben.
