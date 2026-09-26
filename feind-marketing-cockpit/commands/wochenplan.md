---
description: Wochenplan Montag bis Freitag aus Fristen, Follow-ups, Content und Events erstellen
argument-hint: "[KW oder Startdatum, Standard laufende Woche]"
---

Erstelle mit dem Subagenten `feind-copilot` den Wochenplan für $ARGUMENTS
(ohne Angabe: laufende Woche, Montag bis Freitag).

1. Grundlage aus `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd` (`ArtifactData`): Fristen in `tenders`, fällige
   Follow-ups in `leads`, `content.plannedDate`, `events` mit offenen Checklistenpunkten.
2. Falls Google Calendar verbunden ist: feste Termine lesend berücksichtigen.
3. Saisonkalender des Copiloten beachten; höchstens drei Marketing-Aufgaben pro Tag,
   Fristen zuerst.
4. Speichere den Plan als `weekPlan` im Briefing des Montags (`briefings/<JJJJ-MM-TT>`,
   `update`, falls vorhanden).
5. Kalendereinträge oder ClickUp-Aufgaben nur als Vorschlag ausgeben; anlegen erst
   nach Davids Bestätigung.
