# Abnahme Feind Cockpit v1.0 – 28.09.2026

Grundlage: `Feind-Cockpit-Konsolidierung.md`, Kap. 10 (Akzeptanzkriterien), Kap. 4 (blinde Flecken)
und Kap. 11 (Wellen 1–5). Die Prüfung ist automatisiert, soweit möglich: `npm run test:cockpit`
(27 Unit-Tests) und `npm run e2e:cockpit` (13 E2E-Tests, Chromium, gemockte claude-Laufzeit).

## Akzeptanzkriterien

| # | Kriterium | Ergebnis | Nachweis |
|---|---|---|---|
| 1 | Beide Welten über die Top-Nav erreichbar | ✅ | E2E AK1, inkl. Pfeiltasten |
| 2 | Alle KERN-Funktionen aus Kap. 3 vorhanden | ✅ | E2E AK2: 8 + 14 + 10 Reiter; zusätzlich v3-Module (Akquise, Packen, Vorlagen), Notion-Live |
| 3 | Kein externes CDN außer Google Fonts | ✅ | E2E AK3: 0 `<script src>`, 1 Stylesheet |
| 4 | Offline-First | ✅ | E2E AK4: InfraTech lokal persistent; Marketing zeigt den letzten Stand, nur lesend |
| 5 | Exporte CSV, MD, ICS | ✅ | E2E AK5: 5 Dateien, BOM/Semikolon, ICS-Zeilen ≤ 75 Oktett |
| 6 | Admin-Rollen: Nicht-Admins nur lesend | ✅ | E2E AK6 (Viewer/Editor). Serverseitig über die DB-Regel `admin` → `write: admin` |
| 7 | `mkt_leads` und `leads/counts` getrennt | ✅ | E2E AK7, Unit-Test Migration |
| 8 | Accessibility (axe, tab-fokussierbar) | ⚠️ bestanden mit 1 Ausnahme | E2E AK8: 32 Reiter × 2 Themes. Ausnahme: `.btn.primary` Anthrazit auf Grün 3,74:1, CI-Vorgabe, **Entscheidung offen** |
| 9 | Saubere Druckausgabe | ✅ | E2E AK9: Navigation ausgeblendet, Druckkopf, helle Tokens auch im Dunkel-Theme |
| 10 | Kein Datenverlust bei Migration | ✅ | E2E AK10 über die UI, 7 Unit-Tests; keine Löschungen, idempotent |
| 11 | Innovationspreis-Alarm im Dashboard | ✅ | E2E AK10/11, **datengetrieben**: rot vor der Migration, „eingereicht“ danach |
| 12 | Read-only-Banner | ✅ | E2E AK6/12 |
| 13 | Auto/Hell/Dunkel | ✅ | E2E AK13, bleibt über Neuladen erhalten |
| 14 | CI-Tokens korrekt | ✅ | E2E AK3/14; keine harten Farbwerte in Skript oder Markup |
| 15 | Datei < 500 KB | ✅ | ca. 330 KB |

**14/15 bestanden, 1 mit dokumentierter CI-Ausnahme.**

## Bewusste Abweichungen vom Auftragsdokument

| Vorgabe | Umsetzung | Grund |
|---|---|---|
| Basis-Code Kap. 8 | Basis: Repo-Cockpit v3 plus A2 | Kap. 8 hätte Funktionen aus v3 (PR #24–28) verloren |
| `migrate-leads.js` mit firebase-admin | Migration im Browser + `tools/migrate.mjs` auf JSON | Der Artefakt-Speicher ist kein Firestore, es gibt keinen Service-Account |
| „overrides löschen“ (Kap. 7) | übernehmen und markieren, nie löschen | Override `i1` enthält den einzigen Nachweis „Innovationspreis eingereicht“ |
| Jest + jsdom | `node:test` | Repo-Konvention, keine zusätzliche Abhängigkeit; Tests laden den Kern direkt aus der HTML |
| „Vollständiges HTML mit doctype“ | Seitenfragment, `lang` per Skript | Die Artefakt-Hülle ergänzt das Gerüst; ein eigenes würde verschachtelt |
| Team mit Namen | Rollen + opake Konto-ID | DSGVO / Kap. 12.6 / CLAUDE.md |
| Innovationspreis-Banner fest | aus Aufgabe `i1` abgeleitet | Der feste Banner war nach der Einreichung falsch |

## Blinde Flecken (Kap. 4 + neu gefunden)

| # | Befund | Status |
|---|---|---|
| 1–10 | Kap. 4 | alle adressiert (Nr. 1 datengetrieben statt statisch) |
| B1 | Kap. 8 ist ein Rückschritt gegenüber v3 | gelöst |
| B2 | `overrides` wird im Live-Cockpit nie ausgewertet; der Status „eingereicht“ ist unsichtbar | gelöst, sobald die Migration läuft |
| B3 | Kap. 7 hätte genau diesen Status gelöscht | gelöst |
| B4 | Firebase-Skript läuft in dieser Umgebung nicht | gelöst |
| B5 | Jedes Artefakt hat eine eigene DB; ein neues Artefakt startet leer | **Entscheidung: Ziel-Artefakt** |
| B6 | Standentwurf 15.11. (Handbuch 2027) gegenüber 21.11. (Referenz 2026) | übernommen, **schriftlich bestätigen lassen** |
| B7 | Budget 24.200–26.500 € gegenüber 500 € im Marketing-Scan | sichtbar gemacht; GL-Entscheidung 1 |
| B8 | Admin-Rolle war nur Anzeige | DB-Regel |
| B9 | Klarnamen von Kolleg:innen in Seeds/Collections | Rollen |
| B10 | Uneinheitliche `user`-API | Vertrag 0.2.61 |
| B11 | `set({merge:true})` gibt es nicht; Team hätte Marketing-Schwellen überschrieben | `settings/infratech` |
| B12 | Google Sheet ist laut Manager-Charta „führende Quelle“ für Team-Aufgaben: Doppelpflege | **Entscheidung** |
| B13 | Anthrazit auf Grün verfehlt WCAG AA (3,74:1) | teilweise gelöst; **Entscheidung für Primär-Buttons** |
| B14 | Schnelle Navigation wurde nach 800 ms zurückgesetzt | behoben (E2E) |
| B15 | Innovationspreis-Teilaufgaben i2–i5 (Fälligkeit 23.–25.09.) ohne Status | **Status bestätigen** |
| B16 | Notion-Live war im Kap.-8-Gerüst entfallen, obwohl KERN | wiederhergestellt |
