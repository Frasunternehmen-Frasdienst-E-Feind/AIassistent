# Feind Cockpit A1 (Live-Stand)

**Live:** https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd (Version 17 vom 01.10.2026, Veröffentlichung nach Freigabe)

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

Regeln:
- Notion ist führend. Titel, Bereich, Zuständig (Rolle), Budget und „Blockiert durch“ werden nur in Notion gepflegt.
- Zuordnung über das Feld „Cockpit-ID“; Zeilen ohne ID erscheinen als `n-<Nr>`.
- Vor jedem Schreiben wird neu gelesen; ein inzwischen in Notion geändertes Feld wird nur nach Rückfrage überschrieben.
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
