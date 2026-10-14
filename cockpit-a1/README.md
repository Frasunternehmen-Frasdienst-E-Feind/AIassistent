# Feind Cockpit A1 (Live-Stand)

> **Übernommen in v3 (08.10.2026):** Alle A1-Funktionen stecken jetzt im führenden Cockpit v3 (`messe/rotterdam-2027/feind-cockpit-v3.html`, Artefakt GRG81). `src/` bleibt die Quelle dieser Module; Änderungen dort in v3 übernehmen. A1 ist seit der Veröffentlichung von v3 (08.10.2026, GRG81 Version 10) eingefroren: nicht mehr beschreiben.

**Live:** https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd (Version 17 vom 01.10.2026, Veröffentlichung nach Freigabe)

> **Stand Repo 02.10.2026: vor der Live-Version.** Korrekturen aus dem Code-Review zu PR #36 (Schreibreihenfolge je
> Aufgabe, „Blockiert durch“ beim Anlegen, Übertragen-Sperre, Admin-Schalter `notionTasks`) sind hier enthalten und
> gehen erst mit der nächsten freigegebenen Veröffentlichung live.

`Feind-Cockpit-A1.html` ist der veröffentlichte Stand des Artefakts. A1 ist die führende Codebasis;
der Ordner `cockpit/` ist der ältere A4-Stand und nur noch Archiv.

## InfraTech-Aufgaben live aus Notion

Führende Quelle der Team-Aufgaben ist die Notion-Datenbank **„Aufgaben InfraTech 2027“**
(https://app.notion.com/p/5718273f9a2c4ba085d5da4e62c0c878, unter „Messe Rotterdam 2027 — InfraTech“).
Die ClickUp-Liste ist als „[ARCHIV] …“ umbenannt, die alte Notion-Checkliste ist übernommen.

| Richtung | Was | Werkzeug (Connector „Notion“) |
|---|---|---|
| Lesen | alle Zeilen der Standardansicht, jede Minute | `notion-query-data-sources` (view) |
| Schreiben | Status, Fällig, Priorität, Notiz, Beschluss, Archiviert | `notion-update-page` |
| Anlegen | neue Aufgaben aus Liste und Meeting-Modus (Quelle „Cockpit“/„Meeting“) | `notion-create-pages` |

Das Capability-Manifest des Artefakts muss alle drei Werkzeuge deklarieren, sonst lehnt claude.ai das Schreiben
mit `not_in_manifest` ab (Stand v17: deklariert):
`"mcp": { "servers": [ { "server": "Notion", "tools": ["notion-query-data-sources", "notion-update-page", "notion-create-pages"] } ] }`
(plus die Werkzeuge für Microsoft 365 und Canva).

Regeln:
- Notion ist führend. Titel, Bereich, Zuständig (Rolle), Budget und „Blockiert durch“ werden nur in Notion gepflegt.
- Zuordnung über das Feld „Cockpit-ID“; Zeilen ohne ID erscheinen als `n-<Nr>`.
- Vor jedem Schreiben wird neu gelesen; ein inzwischen in Notion geändertes Feld wird nur nach Rückfrage überschrieben.
- Änderungen an derselben Aufgabe laufen nacheinander; eine zweite schnelle Änderung wartet auf die erste.
- Beim Anlegen geht „Blockiert durch“ als Notion-Relation mit; danach wird es nur in Notion gepflegt.
- Abschaltbar unter Admin → Funktionen („InfraTech-Aufgaben live aus Notion“, `features.notionTasks`).
- „Person (intern)“ wird nie gelesen oder angezeigt (Datenschutz). Im Cockpit stehen nur Rollen.
- Geschrieben wird mit dem Notion-Zugang der ansehenden Person. Ohne Zugang: letzter Notion-Stand
  aus dem Artefakt-Speicher (`notion/tasks`), nur lesend.
- Nichts wird gelöscht; „Archiviert“ statt Löschen.

## Aktionsleiste, Erläuterungen und Brennglas-PDF

Seit Version 16 (andere Sitzung, 01.10.2026) hat jeder Reiter aller drei Welten eine Aktionsleiste
(höchstens drei Knöpfe, Rest unter „Mehr“) mit Brennglas-PDF zum Ausfüllen, Druckfassung, CSV, Kalender und
Kopieren; dazu Erläuterungs-Bubbles (`app-tooltip.js`). Version 17 härtet das PDF-Laden: jsPDF 4.2.1 statt
2.5.1, mit SRI-Hash, `crossorigin="anonymous"` und ohne Referrer. Drucken: `window.print()` ist im
claude.ai-Viewer gesperrt; die Druckfassung startet beim Öffnen den Druckdialog.

## Quellen und Tests

- `src/notion-tasks.js` – reine Zuordnungsfunktionen (Zeile ↔ Aufgabe, Konflikte, Notion-Eigenschaften)
- `src/app-notion-tasks.js` – Anbindung in der Seite (Laden, Schreiben, Statuszeile)
- `test/notion-tasks.test.mjs` – Unit-Tests, prüfen auch, dass beide Module unverändert im Artefakt stecken
- `src/brennglas.js` – Brennglas-PDF-Renderer aus dem Live-Stand (jsPDF 4.2.1 mit SRI)
- `test/brennglas.test.mjs` – Unit-Tests (SRI passt zur Datei, CI-Farben, Datenschutz-Filter, Formularfelder, Druckfassung, Einbettung)
- `e2e/actions-smoke.mjs` – Browser-Test aller 26 Reiter: jede PDF- und Druckaktion (`node cockpit-a1/e2e/actions-smoke.mjs [html]`)
- `e2e/notion-smoke.mjs` – Browser-Test mit simuliertem Notion-Connector (`node cockpit-a1/e2e/notion-smoke.mjs`)

Änderungen: Module in `src/` anpassen, in `Feind-Cockpit-A1.html` übernehmen, Tests laufen lassen, dann
veröffentlichen (nur nach Freigabe).

Nicht geprüft: die Anbindungen an Microsoft 365 und Canva in A1.
