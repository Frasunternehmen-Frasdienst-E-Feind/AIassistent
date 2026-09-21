# InfraTech 2027 – Rotterdam Ahoy (Messeplanung E. Feind)

Zentrale, konsolidierte Planung für den Messeauftritt der Fräsdienst-Service E. Feind GmbH
auf der **InfraTech 2027, Rotterdam Ahoy, 12.–15. Januar 2027**.

## Inhalt dieses Ordners

| Datei | Zweck |
|---|---|
| `infratech-2027-liste.html` | **Interaktives Cockpit** (Artefakt-Quelle). Aufgaben, Fristen, Budget, KPIs, Lessons Learned, Faktencheck, Wissensbasis. Kategorisiert, filterbar, mit Fortschritt und Terminwarnungen. |
| `MASTER-TODO.md` | Vollständige, kategorisierte Aufgabenliste als versionierbarer Text (Grundlage des Cockpits). |
| `KATEGORISIERUNG-MANUS.md` | Kategorisierung der MANUS-Export-Inhalte + Plan, wie sie die ToDo-Liste ergänzen. |
| `FUNKTIONS-BACKLOG.md` | Backlog neuer Funktionen/Installationen für die Weiterentwicklung des Cockpits. |

Der zugehörige Manager-Agent ist in `../../.claude/agents/messe-manager.md` beschrieben.

## Live-Cockpit

- Artefakt: https://claude.ai/artifact/4zX58mseXB9vbspN8xAzJ2 (privat – nur für Berechtigte)
- Datenhaltung: geteilte Artefakt-Datenbank (`db`), Sammlung `overrides/<taskId>` = `{ status, note }`.
  Fällt die Datenbank aus, speichert die Seite pro Gerät lokal (localStorage).
- Der eingebettete Aufgabenstand im HTML ist Erstbefüllung und Notfall-Anzeige.

## Corporate Design

Farben, Schriften, Radien und Abstände stammen aus `../../branding/feind-ci.tokens.json`
(Grün `#84bb20`, Anthrazit `#424e4e`, Rot `#e3000b` nur als Signal). Beide Themes werden ausgeliefert.

## Wichtige, offene Punkte (Stand der Erstellung)

1. **Innovationspreis-Frist:** Faktencheck nennt **25.09.2026**, alte ToDo nannte 31.10.2026 → beim Veranstalter verifizieren.
2. **Messedatum:** offiziell **12.–15.01.2027** (nicht 12.–14.) → Auf-/Abbauplan auf vier Messetage anpassen.
3. **Verbindliche 2027-Fristen** (Anmeldung, Standentwurf, VRS/Slot) bei infratech.nl / Ahoy anfordern.
4. **Datenschutz:** Personenbezogene Kontaktdaten Dritter (Leadliste 2026) werden **nicht** in Cockpit
   oder Repository übernommen; sie bleiben in der geschützten Originaldatei.
