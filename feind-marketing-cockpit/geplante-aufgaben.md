# Geplante Aufgaben für Cowork

Diese Aufgaben legt David in Cowork selbst an: im Bereich „Geplante Aufgaben“ bzw.
im Chat mit `/schedule`. Das Plugin kann sie nicht automatisch einrichten. Die genaue
Lage des Menüs kann je nach App-Version abweichen.

Alle Zeiten Europe/Berlin. Voraussetzung: Plugin installiert, Dashboard-URL statt
`{{DASHBOARD_URL}}` eingesetzt, Cowork zur Ausführungszeit erreichbar (bei lokal
ausgeführten Aufgaben muss der Rechner an sein). Keine Aufgabe versendet oder
veröffentlicht etwas; Ergebnisse landen im Cockpit und als Entwurf.

## 1. Tagesbrief

* **Name:** Feind Cockpit – Tagesbrief
* **Zeitplan:** täglich 07:00 (Vorschlag: nur Montag bis Freitag)
* **Ergebnisablage:** `briefings/<JJJJ-MM-TT>` im Cockpit, Kurzfassung im Aufgabenverlauf

Prompt zum Einfügen:

```
Führe /tagesbrief für heute aus. Nutze den Subagenten feind-copilot und das
Marketing Cockpit {{DASHBOARD_URL}}. Zähle nur aus den Daten im Cockpit, prüfe die
Anomalien (Lead-Einbruch, Frist übersehen, Content länger als 14 Tage im Entwurf,
Lead ohne Kontakt länger als 5 Tage) und schreibe das Ergebnis nach
briefings/<heutiges Datum>. Nichts versenden oder veröffentlichen.
```

## 2. Follow-up-Erinnerungen

* **Name:** Feind Cockpit – Follow-ups
* **Zeitplan:** täglich 08:00 (Vorschlag: Montag bis Freitag)
* **Ergebnisablage:** Punkte `module: "leads"` in `briefings/<JJJJ-MM-TT>`; E-Mail-Entwürfe in Gmail (nicht gesendet)

Prompt zum Einfügen:

```
Prüfe mit dem Skill lead-tracking im Marketing Cockpit {{DASHBOARD_URL}} alle Leads,
deren Stage nicht gewonnen oder verloren ist und deren lastContact älter als
followupDays (settings/general) ist, sowie alle mit nextActionDate heute oder früher.
Ergänze das heutige Briefing unter briefings/<heutiges Datum> um je einen Punkt pro
fälligem Lead (Organisation, nextAction, Tage seit Kontakt; keine Personendaten).
Erstelle auf Wunsch Entwürfe mit vorlagen/follow-up-lead.md, versende aber nichts.
```

## 3. Content-Performance

* **Name:** Feind Cockpit – Content-Performance
* **Zeitplan:** freitags 15:00
* **Ergebnisablage:** Punkte `module: "content"` in `briefings/<JJJJ-MM-TT>`

Prompt zum Einfügen:

```
Führe /content-performance für die laufende Woche aus. Nutze die Skills
content-pipeline und seo-local mit dem Marketing Cockpit {{DASHBOARD_URL}}.
Nenne veröffentlichte Beiträge, Beiträge im Review, Entwürfe älter als 14 Tage und
die Planung der Folgewoche. Reichweitenzahlen nur mit Quelle, sonst "nicht
verfügbar". Schließe mit drei Empfehlungen für die nächste Woche und schreibe das
Ergebnis ins heutige Briefing.
```

## 4. Lead-Report

* **Name:** Feind Cockpit – Lead-Report
* **Zeitplan:** sonntags 18:00
* **Ergebnisablage:** Punkte `module: "leads"` in `briefings/<JJJJ-MM-TT>` (Datum Sonntag), Wochenplan der Folgewoche im Briefing des Montags

Prompt zum Einfügen:

```
Führe /lead-report für die letzten 7 Tage aus, im Vergleich zum Durchschnitt der
4 Wochen davor. Nutze den Skill lead-tracking und das Marketing Cockpit
{{DASHBOARD_URL}}. Danach /wochenplan für die kommende Woche als Vorschlag.
Keine Personendaten, keine Preise, jede Kennzahl mit Datenstand aus meta/sync.
```
