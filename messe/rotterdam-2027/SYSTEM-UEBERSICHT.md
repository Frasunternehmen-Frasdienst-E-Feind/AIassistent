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

| # | Fund | Schwere | Status / Empfehlung |
|---|---|---|---|
| **B1** | Innovationspreis-Frist (25.09.2026). | ✅ erledigt | Fristgerecht eingereicht; Status: warten auf Rückmeldung. |
| **B2/B3** | **Mehrere Aufgaben-Systeme** (Sheet, Cockpit, ClickUp, Notion, Checkliste). | ✅ entschieden | Rollen fixiert (siehe Abschnitt 6): **ClickUp wird stillgelegt**, Notion **bleibt als Wissens-Hub**. |
| **B4** | **Verbindliche 2027-Ahoy-Fristen** – jetzt aus Handbuch V1.3 belegt (Notion-Hub). | ✅ teils geklärt | In Abschnitt 7 übernommen; verbleibend: Bauhöhe/Bodenlast/Maschinenregeln aus Ahoy-Portal. |
| **B9** | **Stand 5.209** – Feind steht auf der Ausstellerliste; Portal zeigt nur Essen 2028. | 🔴 kritisch | Intern klären, ob Rotterdam 2027 bereits (unter anderem Login) angemeldet ist, bevor neu angemeldet wird. |
| **B10** | **Owner/Projektleitung 2027** noch nicht benannt. | 🟠 hoch | Geschäftsführung benennt Owner (Blocker für Budget/Team/Hotel). |
| **B5** | **PR #13 offen (Draft)** – Arbeit liegt auf dem Branch, nicht gemergt. | 🟡 mittel | PR prüfen und mergen, wenn du den Stand übernehmen willst. |
| **B6** | **Team-Zugriff aufs Cockpit** – Artefakt ist privat (nur David). | 🟡 mittel | Bei Bedarf über „Teilen" freigeben (Team-Tab existiert im Cockpit). |
| **B7** | **Agent-Automatik ohne Connector** – die Wochen-Routine konnte Sheet/db nicht selbst lesen. | 🟡 mittel | Charter + Routine ergänzt (liest jetzt das Sheet read-only, meldet Deltas). |
| **B8** | **Standnummer 2027** noch „tbd". | 🟡 mittel | Mit Handbuch/Portalzugang klären (Aufgabe vorhanden). |

## 4. Zuletzt verbessert (dieser Durchlauf)
- Apps-Script **erkennt Tab/Kopfzeile/Spalten automatisch** (Tab-Name muss nicht bekannt sein) + Menüpunkt „Erkannten Aufgaben-Tab anzeigen".
- Sheet-Integration als **Paket A** dokumentiert (Live-Tab + idempotenter Import).
- **Optionales abgegrenzt & angebunden:** der Manager-Agent liest im Wochencheck das Sheet (read-only) und meldet Abweichungen zum Cockpit – klar getrennt vom Live-Betrieb im Sheet.
- Diese **Systemübersicht** als zentrale Landkarte.

## 5. Konsolidierungs-Entscheidung (B2/B3 – umgesetzt)
Nach Prüfung der tatsächlichen Inhalte gilt „eine Quelle pro Zweck":

| System | Entscheidung | Rolle ab jetzt |
|---|---|---|
| **Google Sheet** | **behalten** | Einzige operative Aufgaben-/Statusquelle (Team + Messe, Tab „Messe-Aufgaben") |
| **Notion-Hub** | **behalten** | Wissens- & Entscheidungs-Hub (verifizierte Fakten, Fristen, Entscheidungsreihenfolge, Risiken) – **kein** Task-Tracker |
| **Cockpit-Artefakt** | behalten | Visuelle Messe-Übersicht (KPIs, Budget, Faktencheck) |
| **ClickUp** | **stilllegen** | Redundanter dritter Task-Speicher; einzigartige Tickets ins Sheet übernommen, dann archivieren |
| **Checkliste-Artefakt** | einmotten | Nur noch als Druck-/Abhak-Ansicht |

**Übernommen aus ClickUp/Notion** (in den Sheet-Import bzw. Fristen eingearbeitet): Owner benennen, Stand-5.209-Klärung, ILB-Förderung, DSV-VRS-Slots, Dienstleister-Register-Check, Standpersonal festlegen, Standentwurf-Frist 15.11.2026.

## 6. Verifizierte 2027-Fristen (Ahoy Handbuch V1.3, via Notion-Hub)
| Frist | Datum |
|---|---|
| Innovationspreis einreichen | 25.09.2026 (erledigt) |
| Standentwurf (Individualstand) | **15.11.2026** |
| Standbau-Bestellungen · Hestex/Stabilo | 01.12. · 02.12.2026 |
| Eigenes Catering | 15.12.2026 |
| Strom/Wasser · Möbel | 06.01.2027 (ab 29.12. +10 %, ab 05.01. +20 %) |
| Internet · Parken | 04.01.2027 |
| Aufbau | Do 07.01. (schwere Güter 07:30–14:00) – Mo 11.01.2027 |
| Abbau | Fr 15.01. ab 16:00 (Lkw ab 20:00) – Mo 18.01.2027 |
| Kosten | Fläche 250 €/m² + Paket 95–230 €/m² + Pflicht-Marketingpaket 295 € |
| Kontakt | info@infratech.nl · Logistik DSV-VRS: fairs.rotterdam@dsv.com |

## 7. Nächste Entscheidungen/Aktionen für David
1. **B9 – Stand 5.209:** intern klären, ob Rotterdam 2027 schon angemeldet ist (Login/Konto).
2. **B10 – Owner** benennen (Geschäftsführung).
3. **ClickUp stilllegen:** Liste „Messe Rotterdam 2027 – InfraTech" umbenennen in „ZZ ARCHIV …" (wie beim Doppel) oder schließen, sobald der Sheet-Import erfolgt ist.
