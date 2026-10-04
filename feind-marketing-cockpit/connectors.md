# Connectors – Bedarf, Status, Nutzung

Connectors (MCP-Server) für Cowork bzw. claude.ai werden **in der App verbunden**
(Einstellungen → Connectors), nicht über eine Datei im Plugin. Das Plugin setzt nur
voraus, dass sie verbunden sind, und nutzt sie über die jeweiligen Werkzeuge.
Stand: 2026-09-24.

## Übersicht

| Bedarf | Empfohlener Connector | Status | Genutzt von |
|---|---|---|---|
| Lead-Eingang per E-Mail, Follow-up-Entwürfe | Gmail | verbunden | `lead-tracking`, `feind-copilot` (nur lesen und Entwürfe) |
| Termine, Messen, Baustellenbesichtigungen, Wochenplan | Google Calendar | verbunden | `event-planning`, `feind-copilot` |
| Dateiablage (Content, Events, Referenzen) | Google Drive | verbunden | `content-pipeline`, `reference-library`, `event-planning` |
| Dateiablage alternativ / Fotoarchiv | Dropbox | verbunden | `reference-library`, `content-pipeline` |
| Redaktionsplan, Notizen, Marketing-Scan | Notion | verbunden | `content-pipeline`, `seo-local` |
| Aufgaben InfraTech 2027 (führende Liste seit 01.10.2026) | Notion, Datenbank „Aufgaben InfraTech 2027“ | verbunden, Cockpit liest und schreibt live | Cockpit, `event-planning`, `feind-copilot` |
| Aufgaben und Freigaben (InfraTech-Liste stillgelegt, nur Link auf Notion) | ClickUp | verbunden | `feind-copilot` (Wochenplan, nur andere Listen) |
| Ausschreibungen TED und service.bund.de | eigener MCP-Server `feind-vergabe` (`mcp/feind-vergabe`, lokal über stdio) | Prototyp seit 30.09.2026 | `tender-monitoring` |
| Webrecherche, übrige Vergabeportale | Firecrawl | verbunden | `tender-monitoring`, `seo-local` |
| Webrecherche (Suche) | Parallel Search | verbunden | `tender-monitoring`, `seo-local`, `reference-library` |
| Grafiken, Social-Media-Vorlagen | Canva | verbunden | `content-pipeline` |
| Übersetzung und Korrektur | DeepL | verbunden | `content-pipeline` |
| Kundenbeziehungen, Lead-Pipeline | HubSpot (von David bestätigt) | nicht verbunden – in Cowork unter Connectors hinzufügen; bis dahin CSV-Export | `lead-tracking` |
| Unternehmensablage | SharePoint oder Nextcloud | nicht verbunden – offene Frage | alle Skills mit Dateizugriff |
| LinkedIn-Unternehmensseite (Reichweite, Posts) | LinkedIn | nicht verbunden – offene Frage | `content-pipeline` |
| Firmen-E-Mail und -Kalender, falls nicht Google | Outlook / Microsoft 365 | nicht verbunden – offene Frage | `lead-tracking`, `event-planning` |
| Suchleistung und Website-Traffic | Google Search Console, Google Analytics 4 | nicht verbunden – offene Frage | `seo-local` |

Solange ein Bedarf nicht verbunden ist, arbeiten die Skills mit Exporten, die David
ablegt (z. B. CSV aus Search Console in `Marketing/`), oder mit manueller Eingabe
(`source: "manuell: David"`). Kennzahlen aus nicht verbundenen Quellen werden nie
geschätzt.

Hinweis GA4: Laut Datenschutzbericht fehlt derzeit ein Consent-Banner mit Opt-in vor
GA4. Vor einer Anbindung von GA4-Daten: „Bitte Rechtsabteilung prüfen.“

## Offene Fragen

1. ~~Welches CRM?~~ Beantwortet: HubSpot (24.09.2026). Offen: Freigabe der Anbindung durch GF/Datenschutz.
2. Liegt die Unternehmensablage in Google Drive, Dropbox, SharePoint oder Nextcloud?
3. Ist die Firmen-E-Mail Gmail/Google Workspace oder Outlook/Microsoft 365?
4. Soll LinkedIn angebunden werden, und wer verwaltet die Unternehmensseite?
5. Gibt es Zugriff auf Search Console und GA4 für fraesdienst-feind.de?

## Datei `.mcp.json`

Die Datei `.mcp.json` im Plugin-Ordner trägt nur den lokalen Server `feind-vergabe`
(`mcp/feind-vergabe`, öffentliche Ausschreibungen aus TED und service.bund.de, nur lesend).
Er startet aus `dist/src/index.js`; `build-zip.sh` baut ihn beim Paketieren. Für die übrigen
Dienste wurde kein offizieller Remote-MCP-Endpunkt geprüft und belegt, deshalb steht dort nichts.

### Server ergänzen

Bevorzugt: den Connector in Cowork bzw. claude.ai unter Einstellungen → Connectors
hinzufügen. Das ist der unterstützte Weg und hält Zugangsdaten aus dem Plugin heraus.

Nur wenn ein Server fest zum Plugin gehören soll, in `.mcp.json` eintragen:

```json
{
  "mcpServers": {
    "beispiel-crm": {
      "type": "http",
      "url": "https://<offizieller-endpunkt-laut-anbieterdoku>/mcp"
    }
  }
}
```

Regeln dafür:
* Nur Endpunkte aus der offiziellen Dokumentation des Anbieters; URL und Quelle in
  dieser Datei vermerken.
* Keine API-Schlüssel oder Tokens in die Datei schreiben; Anmeldung per OAuth des
  Anbieters oder über Umgebungsvariablen (`${VARIABLE}`).
* Lokale Server, die mit dem Plugin ausgeliefert werden, mit `${CLAUDE_PLUGIN_ROOT}`
  referenzieren (z. B. `"command": "${CLAUDE_PLUGIN_ROOT}/server/start.sh"`).
* Nach dem Eintrag Tabelle oben aktualisieren (Status, genutzt von Skill).
* Vor Anbindung eines Dienstes, der personenbezogene Daten verarbeitet (CRM, E-Mail):
  Auftragsverarbeitungsvertrag prüfen – „Bitte Rechtsabteilung prüfen.“
