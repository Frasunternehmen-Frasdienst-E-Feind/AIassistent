---
description: Tagesbrief aus dem Marketing Cockpit erzeugen und unter briefings/<Datum> speichern
argument-hint: "[Datum JJJJ-MM-TT, Standard heute]"
---

Erzeuge mit dem Subagenten `feind-copilot` den Tagesbrief für $ARGUMENTS
(ohne Angabe: heutiges Datum).

1. Lies über `ArtifactData` aus `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`: `content`, `leads`, `tenders`,
   `events`, `seo_keywords`, `settings/general`, `meta/sync`.
2. Zähle neue Leads, Ausschreibungen mit Frist diese Woche und Content im Status
   `review` ausschließlich aus diesen Daten. Form der Kopfzeile:
   „3 neue Leads, 2 Ausschreibungen mit Frist diese Woche, 1 LinkedIn-Post wartet auf Freigabe“.
3. Prüfe die Anomalien aus dem Abschnitt „Anomalien erkennen“ des Copiloten
   (Lead-Einbruch, Frist übersehen, Content > 14 Tage im Entwurf, Lead ohne Kontakt > 5 Tage).
4. Schreibe das Ergebnis nach `briefings/<JJJJ-MM-TT>` (`generatedBy: "copilot"`).
5. Gib David den Brief in höchstens 8 Zeilen aus, mit Datenstand aus `meta/sync`.

Fehlen Daten, sag das und empfiehl `/cockpit-sync`. Keine Zahl ohne Datensatz.
