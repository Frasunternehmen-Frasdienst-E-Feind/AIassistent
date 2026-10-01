# Feind Cockpit A1 (Live-Stand)

**Live:** https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd (Version 15 vom 01.10.2026, Freigabe vorausgesetzt)

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

## Aktionsleiste und Brennglas-PDF (InfraTech, Pilot)

Unter jedem InfraTech-Reiter steht eine Leiste „Aktionen“ mit den passenden Arbeitserleichterungen.
Jedes PDF gibt es als „· PDF“ (Download) und „Drucken“ (Druckfassung, öffnet beim Öffnen den Druckdialog,
weil `window.print()` im claude.ai-Viewer gesperrt ist). Layout wie die Brennglas-Vorlage `messe/render.py`:
Deckkopf, Kurzanleitung, Legende, Blocker, je Position Ankreuzfeld, Status-Auswahl und Notizfeld (max. 250 Zeichen).

| Reiter | PDF | Schnellaktionen |
|---|---|---|
| Dashboard | Lagebericht (Blocker, P0, 14 Tage, Fristen 45 Tage) | Neue Aufgabe, Meeting, P0 zeigen |
| Aufgaben | Aufgabenliste (aktueller Filter), Je Rolle | In Notion öffnen |
| Fristen | Fristenmatrix | Fristen-Aufgaben |
| Budget | Budget Plan vs. Ist | Budget als CSV |
| Ziele & KPIs | KPI-Messbogen | – |
| Lead-Zähler | Tagesbilanz (nur Stückzahlen) | – |
| Lessons Learned | Maßnahmen-Checkliste | – |
| Faktencheck | Prüfliste (Fakten + Aufgaben mit Prüfvermerk) | – |
| Team | Zuständigkeiten je Rolle | – |
| Protokolle | Protokoll des gewählten Meetings | Meeting starten |

Aktivität und Wissensbasis haben keine Leiste (Exporte dort bleiben wie bisher). PDFs enthalten nur Rollen,
keine Personennamen. jsPDF 4.2.1 wird beim ersten Klick von cdnjs geladen (mit SRI-Prüfung).

## Quellen und Tests

- `src/notion-tasks.js` – reine Zuordnungsfunktionen (Zeile ↔ Aufgabe, Konflikte, Notion-Eigenschaften)
- `src/app-notion-tasks.js` – Anbindung in der Seite (Laden, Schreiben, Statuszeile)
- `test/notion-tasks.test.mjs` – Unit-Tests, prüfen auch, dass beide Module unverändert im Artefakt stecken
- `src/brennglas-pdf.js` – Brennglas-Modelle je Reiter und Renderer (jsPDF, CI-Tokens aus `branding/`)
- `src/app-actions.js` – Aktionsleiste unter den Reitern, Laden von jsPDF, Download/Druck
- `test/brennglas-pdf.test.mjs` – Unit-Tests (Modelle, Datenschutz, Formularfelder, Druckfassung, Einbettung)
- `e2e/actions-smoke.mjs` – Browser-Test aller InfraTech-Reiter (`node cockpit-a1/e2e/actions-smoke.mjs <html> viewer|local`)
- `e2e/notion-smoke.mjs` – Browser-Test mit simuliertem Notion-Connector (`node cockpit-a1/e2e/notion-smoke.mjs`)

Änderungen: Module in `src/` anpassen, in `Feind-Cockpit-A1.html` übernehmen, Tests laufen lassen, dann
veröffentlichen (nur nach Freigabe).

Nicht geprüft: die Anbindungen an Microsoft 365 und Canva in A1.
