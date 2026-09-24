---
description: Lead-Report mit Pipeline, Kanälen, Regionen und fälligen Follow-ups
argument-hint: "[Zeitraum, z. B. 'letzte 7 Tage' oder '2026-09']"
---

Erstelle mit dem Skill `lead-tracking` einen Lead-Report für $ARGUMENTS
(ohne Angabe: letzte 7 Tage, Vergleich mit dem Schnitt der 4 Wochen davor).

Inhalt, ausschließlich aus `leads/*` in `{{DASHBOARD_URL}}`:
* Neue Leads, qualifizierte Leads, gewonnen/verloren im Zeitraum
* Verteilung nach `channel`, `orgType`, `region`
* Pipeline je `stage` (optional `valueBand`, keine Beträge)
* Fällige Follow-ups (`lastContact` älter als `followupDays`) mit `nextAction`
* Anomalie „Lead-Einbruch“ nach Regel des `feind-copilot`

Organisationen nennen, keine Personen. Jede Kennzahl mit Quelle (`source`, Datenstand
aus `meta/sync`). Ergebnis als Punkt `module: "leads"` ins Briefing des Tages schreiben.
