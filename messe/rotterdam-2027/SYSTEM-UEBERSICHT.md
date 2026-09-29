# Messeplanung InfraTech 2027 — Systemübersicht & Rund-um-Check

Stand 26.09.2026. Diese Seite dokumentiert **alle Bausteine, Verknüpfungen und Prozesse**
der Messeplanung, benennt **blinde Flecken** und hält fest, was zuletzt verbessert wurde.
Ziel: ein rundes, überschaubares Gesamtbild – eine Quelle pro Zweck, keine Doppelpflege.

## 1. Bausteine & Verknüpfungen

| Baustein | Zweck | Kopplung / Quelle |
|---|---|---|
| **Google Sheet** „Aufgabenliste_Team_Marketing_FEIND" | **Führende Quelle für Team-Aufgaben & Status** (Automatik: Wochenmail, Log, Backup, Archiv) | Neuer Tab „Messe-Aufgaben" = Live-Sicht (Apps Script) auf Thema Events/InfraTech |
| **Cockpit-Artefakt** `4zX58…` (db) | Visuelle Messe-Planung: Dashboard, Fristen, Budget, KPIs, Lessons, Faktencheck | Eigene Artefakt-DB; Aufgaben ↔ Sheet über den Import + Agent-Report (kein Echtzeit-Sync) |
| **Checkliste-Artefakt** `2FT2wp…` (localStorage) | Einfache gebrandete Abhak-Checkliste (Filter/Druck/CSV) | Nur pro Gerät; **nicht** koppelbar |
| **ClickUp-Liste** | Ticket-/Epic-Sicht (7 Epics/~15) | Bisher **lose**, kein automatischer Abgleich |
| **Notion-Projektseite** | Projekt-/Doku-Ebene | Bisher **lose** |
| **Repo** `AIassistent` (PR #13) | Versionierte Quellen (HTML, Vorlagen, PDFs, Apps Script, Agent-Charter) | Branch `claude/pensive-allen-ri802b` |
| **Manager-Agent** (Routine, Mo) | Terminwächter, DB-Pflege, Erinnerungen (Push/E-Mail) | Charter `.claude/agents/messe-manager.md` |
| **Verknüpftes Claude-Code-Thema** | Baut Cockpit-Funktionen weiter | pflegt `infratech-2027-liste.html` |

## 2. Empfohlene Rollen (eine Quelle pro Zweck)
- **Team-Aufgaben & Status → Google Sheet** (mit Tab „Messe-Aufgaben"). Hier wird gepflegt.
- **Messe-Steuerung (Budget, KPIs, Fristenmatrix, Lessons, Faktencheck) → Cockpit-Artefakt.**
- **Vorlagen/Dokumente (A–E, PDFs) → Repo.**
- **ClickUp/Notion:** bewusst entscheiden (siehe blinde Flecken B3).

## 3. Blinde Flecken (priorisiert)

| # | Fund | Schwere | Empfehlung |
|---|---|---|---|
| **B1** | **Innovationspreis-Frist unbestätigt** – Faktencheck nennt 25.09.2026; **das wäre bereits verstrichen**. | 🔴 kritisch | Heute beim Veranstalter verifizieren; falls verpasst, Nachreichung/Alternative klären. |
| **B2** | **Mehrere Aufgaben-Systeme** (Sheet, Cockpit-db, ClickUp, Notion, Checkliste) ohne klare Hauptquelle → Doppelpflege/Widersprüche. | 🟠 hoch | Rollen aus Abschnitt 2 übernehmen; Checkliste-Artefakt einmotten oder als reine Druckansicht kennzeichnen. |
| **B3** | **ClickUp & Notion lose** – keine Kopplung, evtl. Karteileichen. | 🟠 hoch | Entscheiden: aktiv halten (dann Zweck definieren) oder stilllegen; Doppelarbeit vermeiden. |
| **B4** | **Verbindliche 2027-Ahoy-Fristen** (Anmeldung, Standentwurf, VRS/Slot) noch offen. | 🟠 hoch | Sales-Kontakt bei infratech.nl anfragen (Vorlage liegt vor). |
| **B5** | **PR #13 offen (Draft)** – Arbeit liegt auf dem Branch, nicht gemergt. | 🟡 mittel | PR prüfen und mergen, wenn du den Stand übernehmen willst. |
| **B6** | **Team-Zugriff aufs Cockpit** – Artefakt ist privat (nur David). | 🟡 mittel | Bei Bedarf über „Teilen" freigeben (Team-Tab existiert im Cockpit). |
| **B7** | **Agent-Automatik ohne Connector** – die Wochen-Routine konnte Sheet/db nicht selbst lesen. | 🟡 mittel | Charter + Routine ergänzt (liest jetzt das Sheet read-only, meldet Deltas). |
| **B8** | **Standnummer 2027** noch „tbd". | 🟡 mittel | Mit Handbuch/Portalzugang klären (Aufgabe vorhanden). |

## 4. Zuletzt verbessert (dieser Durchlauf)
- Apps-Script **erkennt Tab/Kopfzeile/Spalten automatisch** (Tab-Name muss nicht bekannt sein) + Menüpunkt „Erkannten Aufgaben-Tab anzeigen".
- Sheet-Integration als **Paket A** dokumentiert (Live-Tab + idempotenter Import).
- **Optionales abgegrenzt & angebunden:** der Manager-Agent liest im Wochencheck das Sheet (read-only) und meldet Abweichungen zum Cockpit – klar getrennt vom Live-Betrieb im Sheet.
- Diese **Systemübersicht** als zentrale Landkarte.

## 5. Nächste Entscheidungen für David
1. **B1 sofort:** Innovationspreis-Frist verifizieren.
2. **B2/B3:** Rollen bestätigen; ClickUp/Notion behalten oder stilllegen?
3. **B5:** PR #13 mergen?
