<!-- Konzept, Stand 30.09.2026 – zur Freigabe durch David, noch nicht umgesetzt -->

# Empfehlung: MCP-Server „feind-vergabe“ für Ausschreibungen

## 1. Empfehlung

**Ich empfehle, einen eigenen Server `feind-vergabe` zu bauen.** Er liest Ausschreibungs-Bekanntmachungen nur aus offiziellen, offenen Quellen:

| Quelle | Zugang | Belegt |
|---|---|---|
| TED API v3 (`api.ted.europa.eu`) | Suche anonym, kein Schlüssel. Fair-Usage-Policy: 700 Anfragen pro Minute, 600 Abrufe in 6 Minuten | ja |
| oeffentlichevergabe.de, Open Data API (Tagesexport `pubDay`, eForms/OCDS) | kostenlos, Lizenz CC0. Authentifizierung und Limits nicht dokumentiert | Lizenz ja, Rest **Annahme: kein Login nötig** |
| service.bund.de, RSS-Feeds | ohne Registrierung, „pro bono“, kein Anspruch auf Vollständigkeit | ja |

**Warum dieser Bereich:**
- **Nutzen:** Der Bereich ist mit „hoch“ bewertet. Die Fristen-Ampel, die Kennzahl „Geprüfte Ausschreibungen pro Woche“ und die Anomalie „übersehene Frist“ hängen direkt daran.
- **Keine Alternative:** Es gibt keinen offiziellen Connector. Heute läuft die Suche als Scraping-Umweg über Firecrawl und Parallel Search.
- **Wenig Aufwand für Zugangsdaten:** Alle drei Quellen sind öffentlich. Der Server braucht keine Zugangsdaten zu Fremdsystemen.
- **Weniger Rechtsrisiko:** Das Scraping von evergabe-online und DTVP fällt weg. Deren Bedingungen erlauben den automatisierten Abruf nicht ausdrücklich bzw. sind nicht belegt.
- **Nicht gebaut:** Ein eigener Search-Console-Server wäre der zweite Kandidat. Der Nutzen ist nur „mittel“ und es gibt schon das Werkzeug `seo-report`. Deshalb vorerst nicht.

**Diese Lücken decken vorhandene Connectors ab, dort wird nichts gebaut:**

| Lücke | Vorhandener Weg | Hindernis |
|---|---|---|
| Leads (`mkt_leads`) | Offizieller HubSpot-Connector bzw. `mcp.hubspot.com` (OAuth) | Freigabe durch GF/Datenschutz und AVV-Prüfung stehen aus |
| SharePoint-Ablage, Messebudget, Referenzen | Microsoft-365-Connector (laut CLAUDE.md am 28.09.2026 bestätigt) | Nur Doku: `connectors.md` und `README.md` bereinigen |
| Events/Kalender (falls Outlook) | Microsoft-365-Connector (Outlook-Kalender) | Klären, ob der Kalender bei Google oder Outlook liegt |
| GA4 | Offizieller Google-MCP, lokal, „Experimental“ | Kein Consent-Banner, **bitte Rechtsabteilung prüfen** |
| Search Console | Kein offizieller Connector; weiter `seo-report` | – |

**Was auch der neue Server nicht löst:**
- LinkedIn-Performance: In der Recherche wurde keine Quelle gefunden.
- Die Rückmeldung zum Angebotsstatus aus dem Vertrieb bleibt Handarbeit.
- Unternehmensfakten, Regionen und Erfolgsmessung sind Pflege- bzw. Datenmodellthemen, keine Connector-Frage.

## 2. Tool-Liste (Präfix `vergabe_`)

| Tool | Zweck | Eingaben | Ausgabe | Nur lesend |
|---|---|---|---|---|
| `vergabe_search_ted` | TED-Bekanntmachungen suchen | `cpv[]`, `nuts[]`, `publishedFrom`, `publishedTo`, `noticeTypes?`, `limit` (Standard 50), `cursor?` | Liste im Normalformat (siehe unten) und `nextCursor` | ja |
| `vergabe_fetch_bekanntmachungen` | Tagesexport von oeffentlichevergabe.de laden und im Server filtern | `pubDay` (JJJJ-MM-TT), `cpv[]`, `nuts[]`, `limit` | Normalformat, `skippedCount`, `parseErrors[]` | ja |
| `vergabe_fetch_bund_rss` | RSS von service.bund.de lesen (Gesamtfeed oder gespeicherter Such-Feed) | `feedUrl?` (nur Hosts auf der Allowlist), `since?` | Normalformat. `deadline` fehlt oft im Feed und wird dann `null` gesetzt | ja |
| `vergabe_get_notice` | Einzelne Bekanntmachung mit Details holen | `source` (`ted`\|`bkms`\|`bund`), `noticeId` | Ein Datensatz mit Frist, Vergabestelle, CPV, NUTS, Links (HTML/PDF/XML) | ja |
| `vergabe_prepare_tenders` | Treffer ins Cockpit-Format bringen, Dubletten erkennen, CPV/Region-Abgleich | `notices[]`, `existing[]` mit `{id, url, deadline, title, status}` (vorher per `ArtifactData list` geholt), `regions[]`, `cpvWatchlist[]` | `{neu[], dubletten[], aktualisiert[]}`; neu mit vollständigem `tenders/<id>`-Entwurf, aktualisiert nur `{deadline, url, source}` plus `vorher`, je Eintrag `matchInfo` | ja (rechnet nur) |
| `vergabe_source_status` | Erreichbarkeit der Quellen, letzte Abrufe, Hinweise auf Limits | – | Je Quelle `{ok, lastFetch, httpStatus, hinweis}` | ja |

**Normalformat eines Treffers:**
`{source, noticeId, title, authority, cpv[], nuts[], deadline, publishedAt, url, noticeType}`

**Datenschutz im Server:** Personenfelder aus eForms (Kontaktperson, E-Mail, Telefon) werden schon beim Parsen verworfen. Übrig bleiben nur Organisation und Behörde.

**Bewertung bleibt im Skill:** `vergabe_prepare_tenders` setzt immer `fit: "pruefen"` und liefert `matchInfo` als Beleg. Die eigentliche Bewertung (`fit`, `fitReason`) macht weiter der Skill `tender-monitoring`.

**Alle Tools lesen nur.** Der Server hat keinen Zugriff auf `db`.

## 3. Technik

- **Sprache und SDK:** TypeScript mit `@modelcontextprotocol/sdk` (Empfehlung aus mcp-builder).
  - Eingaben mit `zod`, strukturierte Ausgabe (`outputSchema`), Annotations `readOnlyHint: true`, `openWorldHint: true`.
  - Fehlermeldungen auf Deutsch und mit Handlungshinweis.
- **Abhängigkeiten:** `fast-xml-parser` für eForms und RSS. Fetch mit Timeout, Wiederholung nach `Retry-After`, Drosselung pro Quelle unterhalb der TED-Fair-Usage-Grenze.
- **Transport:** Beide Transporte aus einem Codebestand.

| Transport | Wofür | Hosting |
|---|---|---|
| `stdio` | Claude Code und Cowork auf Davids Rechner, sofort nutzbar | lokal |
| Streamable HTTP (zustandslos) | Custom Connector in claude.ai, damit Routinen und Web-Sitzungen ihn nutzen | siehe unten |

- **Hosting-Optionen für HTTP:**
  - **(a) Azure Container Apps oder Functions im vorhandenen M365/Azure-Umfeld.** Annahme: Ein Azure-Abo ist vorhanden, das ist nicht belegt.
  - **(b) Cloudflare Workers.** Wenig Betriebsaufwand, aber ein neuer Anbieter.
  - **(c) Kleiner VPS in der EU.**
- **Auth und Secrets:**
  - Zu den Quellen: keine, sie sind öffentlich.
  - Zum eigenen HTTP-Endpunkt: OAuth (für den claude.ai-Connector) oder mindestens ein Bearer-Token.
  - Secrets liegen nur im Secret-Store des Hosts bzw. in einer lokalen `.env`. `.env` steht in `.gitignore`, im Repo liegt nur `.env.example` ohne Werte.
  - Ausgehende Verbindungen nur per Allowlist zu `api.ted.europa.eu`, `oeffentlichevergabe.de` und `www.service.bund.de`.

## 4. Datenfluss ins Cockpit

1. `/cockpit-sync` oder `tender-monitoring` liest `settings/general.regions` und die CPV-Arbeitsliste.
2. Der Skill holt die vorhandenen IDs mit `ArtifactData list tenders`.
3. Der Skill ruft die drei Such-Tools auf (Zeitraum seit `meta/sync.tenders.at`) und danach `vergabe_prepare_tenders`.
4. **David gibt frei:** Claude zeigt eine Tabelle mit neu / Dublette / aktualisiert (Titel, Vergabestelle, Frist, Portal, `matchInfo`). David bestätigt oder wählt ab.
5. Erst dann schreibt Claude **einen** `ArtifactData batch`:
   - `tenders/<id>` mit `set` für neue Einträge.
   - `update` für bestehende Einträge, **nur für `deadline`, `url` und `source`**. `status`, `statusNote` und `fit` bleiben unverändert.
   - Dazu `meta/sync.tenders = {at, source: "feind-vergabe: ted, bkms, bund-rss"}`.
6. **ID-Regel** (Vorschlag, Kleinbuchstaben mit Bindestrich):
   - `ted-<publikationsnummer>`, `bkms-<ocds-id>` bzw. `bund-<hash>`.
   - Dubletten über mehrere Portale werden über Bekanntmachungsnummer, OCDS-ID, Vergabestelle und Frist erkannt.
   - **Annahme:** Deutsche Bekanntmachungen oberhalb der EU-Schwelle erscheinen sowohl im Bekanntmachungsservice als auch in TED. Das ist nicht belegt und muss geprüft werden.
7. **Keine Vergabeunterlagen:** Es werden nur Metadaten übernommen (Compliance-Regel 2).
8. **Anpassungen am Plugin:** `tender-monitoring/SKILL.md` (Abschnitt Quellen), `commands/cockpit-sync.md`, `connectors.md`. Das Schema in `datenmodell.md` bleibt unverändert, weil alle Felder schon vorhanden sind.

## 5. Aufwand, Risiken, offene Fragen

**Aufwand: etwa 8–10 Personentage** (Schätzung, Annahme)

| Arbeitspaket | Personentage |
|---|---|
| Gerüst mit beiden Transporten | 0,5 |
| TED-Client | 1,5 |
| eForms/OCDS-Parser für den Tagesexport (größter Posten) | 2,5–3 |
| RSS | 0,5 |
| Normalisierung und Dubletten | 1 |
| Tests mit festen Beispieldaten und 10 Prüffragen (Evals) | 1–1,5 |
| Hosting und OAuth | 1 |
| Anpassung der Skills und der Doku | 0,5–1 |

**Risiken und Gegenmaßnahmen:**

| Risiko | Gegenmaßnahme |
|---|---|
| Die Nutzungsbedingungen von TED (Legal Notice) und das Impressum von service.bund.de sind nicht geprüft | Vor dem Start klären lassen. **Bitte Rechtsabteilung prüfen.** |
| Personendaten in eForms (Kontakte der Vergabestellen) | Beim Parsen verwerfen; Test, der das absichert. Datenschutzfragen: **Bitte Rechtsabteilung prüfen.** |
| Es ist nicht belegt, dass der Bekanntmachungsservice alle Landesportale und Unterschwellenvergaben enthält | Über `vergabe_source_status` und Stichproben gegen die Landesportale prüfen; Lücken im Briefing als „Quelle unvollständig“ ausweisen |
| Schnittstellen ändern sich (TED v2 läuft aus, eForms-Versionen) | Parser nach Version kapseln, Tests mit festen Beispieldaten, Fehlerliste statt Abbruch |
| Fair-Usage- bzw. Rate-Limits | Drosselung, Cache pro `pubDay`, nur ein Tagesabruf |
| DTVP und evergabe-online sind nicht abgedeckt | Kein Scraping. Den Wortlaut der Nutzungsbedingungen bei DTVP/cosinex anfordern (**bitte Rechtsabteilung prüfen**) |

**Offene Fragen an David** (beste Option zuerst):

1. **Welche Regionen und CPV-Codes sollen gelten?**
   - **(Empfohlen)** David nennt die Regionen einmal, sie werden in `settings.regions` gepflegt und NUTS-Codes zugeordnet. Die CPV-Liste wird bestätigt. Grund: Ohne beides bleibt jeder Treffer auf „pruefen“.
   - Vorläufig nur die CPV-Arbeitsliste nutzen.
2. **Wo läuft der Server?**
   - **(Empfohlen)** Zuerst lokal über `stdio` in Cowork und Claude Code. Grund: kein Hosting, keine Freigabe nötig.
   - Direkt auf Azure als claude.ai-Connector (Betreiber müsste die IT sein).
   - Cloudflare.
3. **Wann wird die Rechtsabteilung eingebunden?**
   - **(Empfohlen)** Die Prüfung der TED- und service.bund.de-Bedingungen parallel zur Entwicklung beauftragen. Live-Betrieb erst nach Rückmeldung.
   - Erst nach dem Prototyp.

## 6. Alternativen

- **Drittanbieter-MCP für TED (ted-mcp.eu oder pipeworx):** Er ist sofort und kostenlos einsatzbereit. Er ist aber nicht offiziell, deckt nur TED ab, also keine nationalen und Unterschwellenvergaben, und bringt eine offene Frage zum Betreiber und zum Datenschutz mit.
- **Kein MCP, sondern ein geplantes Skript (Routine), das den Tagesexport und TED als JSON nach `06_Reports & Analysen/Ausschreibungen/` legt:** Das ist etwas weniger Aufwand und leicht zu betreiben. Claude kann damit aber nicht gezielt nachfragen, etwa zu Details einer einzelnen Bekanntmachung. Außerdem entsteht ein weiterer Dateiumweg ohne Dublettenprüfung beim Abruf.

Grundlage für das Datenmodell: `/home/user/AIassistent/feind-marketing-cockpit/kontext/datenmodell.md` und `/home/user/AIassistent/feind-marketing-cockpit/CLAUDE.md`
