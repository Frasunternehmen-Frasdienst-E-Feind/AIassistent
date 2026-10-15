# InfraTech 2027 – Rotterdam Ahoy (Messeplanung E. Feind)

Zentrale, konsolidierte Planung für den Messeauftritt der Fräsdienst-Service E. Feind GmbH
auf der **InfraTech 2027, Rotterdam Ahoy, 12.–15. Januar 2027**.

## Inhalt dieses Ordners

| Datei | Zweck |
|---|---|
| `feind-cockpit.html` | Altstand v1.1 (Artefakt `4zX58…`, inzwischen gelöscht). Enthält die Erstfassung des Reiters „Checkliste 26→27“. |
| `feind-cockpit-v3.html` | **Quelle des führenden Live-Cockpits** „Feind Cockpit“ (ab 07.10.2026; vorher „Feind Cockpit (Copy)“) (v3.1, Leaflet-Karte): Kartenansicht mit Einwilligung, konfigurierbarem Kachelanbieter, Clustering, lokal eingebetteter Schrift. Doku: **`KARTE.md`**, Tests: `test/` (Unit) und `e2e/` (Playwright). |
| `infratech-2027-liste.html` | Vorgängerstand des Cockpits (v2, Altstand – nicht mehr live). Aufgaben, Fristen, Budget, KPIs, Lessons Learned, Faktencheck, Wissensbasis. Kategorisiert, filterbar, mit Fortschritt und Terminwarnungen. |
| `MASTER-TODO.md` | Vollständige, kategorisierte Aufgabenliste als versionierbarer Text (Grundlage des Cockpits). |
| `KATEGORISIERUNG-MANUS.md` | Kategorisierung der MANUS-Export-Inhalte + Plan, wie sie die ToDo-Liste ergänzen. |
| `FUNKTIONS-BACKLOG.md` | Backlog neuer Funktionen/Installationen für die Weiterentwicklung des Cockpits. |
| `SYSTEM-UEBERSICHT.md` | **Systemlandkarte & Rund-um-Check**: alle Bausteine, Verknüpfungen, blinde Flecken, Rollen (eine Quelle pro Zweck). |
| `vorlagen/` | Vorlagen A–E (Innovationspreis, Standkonzept, Giveaways, Lead/CRM) als MD + bebilderte PDFs. |
| `sheet-integration/` | Apps-Script „Messe-Cockpit" + Anleitung: Tab „Messe-Aufgaben" im Team-Google-Sheet, Live-Sicht + Import. |

Der zugehörige Manager-Agent ist in `../../.claude/agents/messe-manager.md` beschrieben.
Einstieg/Überblick über das Gesamtsystem: **`SYSTEM-UEBERSICHT.md`**.

## Live-Cockpit

- **Führendes Cockpit (ab 07.10.2026):** „Feind Cockpit“ – https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd. Es enthält alles aus „Feind Cockpit (Copy)“ (GRG81) plus Aktionsleiste, Tooltips, Bibliothek, Links, PDF-Rückgabe, Schutz und Brennglas. Ziel des visuellen Umbaus (`umbau/`).
- Vorher führend: „Feind Cockpit (Copy)“ – https://claude.ai/artifact/GRG81suHXorrC1Lekymu9i (Stand 02.10.2026, bleibt bis zur Stilllegung unverändert).
  Seit 02.10.2026 wieder mit dem Reiter **„Checkliste 26→27“** (64 Punkte der ToDo-Liste `2FT2wp…`).
  `feind-cockpit-v3.html` entspricht dem Live-Stand von „Feind Cockpit“ vom 07.10.2026 (inkl. Checkliste, db `checkliste/<Kategorie-Punkt>`), ergänzt um die in diesem Stand fehlende Kachelanbieter-Konfiguration aus v3.1.
- Das frühere Cockpit `4zX58…` existiert nicht mehr.
- Datenhaltung: geteilte Artefakt-Datenbank (`db`): `tasks/<id>` (Aufgaben), `checkliste/<Kategorie-Punkt>` = `{ status, rolle, frist, budget, beschluss, notiz }` (Checkliste 26→27), Alt-Bestand `overrides/<taskId>`.
  Fällt die Datenbank aus, speichert die Seite pro Gerät lokal (localStorage).
- Der eingebettete Aufgabenstand im HTML ist Erstbefüllung und Notfall-Anzeige.

## Corporate Design

Farben, Schriften, Radien und Abstände stammen aus `../../branding/feind-ci.tokens.json`
(Grün `#84bb20`, Anthrazit `#424e4e`, Rot `#e3000b` nur als Signal). Beide Themes werden ausgeliefert.

## Wichtige, offene Punkte (Stand der Erstellung)

1. **Innovationspreis:** fristgerecht eingereicht (Frist 25.09.2026) – Rückmeldung des Veranstalters abwarten.
   **Owner/Projektleitung 2027:** David Halko (Marketing Manager).
2. **Messedatum:** offiziell **12.–15.01.2027** (nicht 12.–14.) → Auf-/Abbauplan auf vier Messetage anpassen.
3. **Verbindliche 2027-Fristen** (Anmeldung, Standentwurf, VRS/Slot) bei infratech.nl / Ahoy anfordern.
4. **Datenschutz:** Personenbezogene Kontaktdaten Dritter (Leadliste 2026) werden **nicht** in Cockpit
   oder Repository übernommen; sie bleiben in der geschützten Originaldatei.
