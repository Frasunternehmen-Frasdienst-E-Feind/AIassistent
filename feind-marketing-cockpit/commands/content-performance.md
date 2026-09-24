---
description: Content-Performance der Woche - Status der Pipeline, Veröffentlichungen, hängende Entwürfe
argument-hint: "[Zeitraum, Standard laufende Woche]"
---

Erstelle mit dem Skill `content-pipeline` (für Website-Kennzahlen zusätzlich
`seo-local`) eine Content-Auswertung für $ARGUMENTS (ohne Angabe: laufende Woche).

1. Aus `content/*` in `{{DASHBOARD_URL}}`: veröffentlicht im Zeitraum, im Review,
   Entwürfe älter als `staleDraftDays`, geplante Beiträge der Folgewoche.
2. Reichweiten- oder Interaktionszahlen nur nennen, wenn sie mit Quelle in `db` oder
   einer von David bereitgestellten Datei vorliegen. LinkedIn und Search Console sind
   derzeit nicht verbunden (siehe `connectors.md`) – dann „nicht verfügbar“ schreiben,
   nichts schätzen.
3. Drei konkrete Empfehlungen für die Folgewoche (Kanal, Thema, Region).
4. Ergebnis als Punkte `module: "content"` ins Briefing des Tages schreiben.
