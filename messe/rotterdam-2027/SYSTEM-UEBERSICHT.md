# Messeplanung InfraTech 2027 — Systemübersicht & Rund-um-Check

Stand 02.10.2026. Diese Seite dokumentiert **alle Bausteine, Verknüpfungen und Prozesse**
der Messeplanung, benennt **blinde Flecken** und hält fest, was zuletzt verbessert wurde.
Ziel: ein rundes, überschaubares Gesamtbild – eine Quelle pro Zweck, keine Doppelpflege.

## 1. Bausteine & Verknüpfungen

| Baustein | Zweck | Kopplung / Quelle |
|---|---|---|
| **Google Sheet** „Aufgabenliste_Team_Marketing_FEIND" | Team-Aufgaben außerhalb der Messe (Automatik: Wochenmail, Log, Backup, Archiv); **für InfraTech nicht mehr führend** (Entscheidung 21.10.2026) | Tab „Messe-Aufgaben" = Live-Sicht (Apps Script); für InfraTech nur noch Lesesicht, nicht pflegen |
| **Cockpit-Artefakt** „Feind Cockpit“ `TfuzbG…` (Cockpit A1, db), führend seit 07.10.2026; vorher `GRG81…` | Marketing · InfraTech 2027 · Admin: Dashboard, Aufgaben, **Checkliste 26→27**, Fristen, Budget, KPIs, Lessons, Faktencheck | Eigene Artefakt-DB; InfraTech-Aufgaben aus der Notion-Datenbank (liest und schreibt zurück). Quelle: `cockpit-a1/Feind-Cockpit-A1.html` |
| **Checkliste-Artefakt** `2FT2wp…` | Ursprüngliche ToDo-Liste (64 Punkte, 12 Kategorien) | **Ins Cockpit übernommen** (Reiter „Checkliste 26→27“, db `checkliste/<Kategorie-Punkt>`); Original bleibt unverändert als Archiv |
| **ClickUp-Liste** | Ticket-/Epic-Sicht (7 Epics/~15) | Bisher **lose**, kein automatischer Abgleich |
| **Notion-Datenbank** „Aufgaben InfraTech 2027“ | **Führende Quelle für Messe-Aufgaben** (Entscheidung David, 21.10.2026) | Cockpit A1 liest und schreibt zurück (siehe Artefakt „Aufgabenfluss“); Messe-Hub `VyegcZ…` verlinkt nur |
| **Repo** `AIassistent` | Versionierte Quellen (HTML, Vorlagen, PDFs, Apps Script, Agent-Charter) | Änderungen über Branch + PR auf `main` |
| **Manager-Agent** (Routine, Mo) | Terminwächter, DB-Pflege, Erinnerungen (Push/E-Mail) | Charter `.claude/agents/messe-manager.md` |
| **Verknüpftes Claude-Code-Thema** | Baut Cockpit-Funktionen weiter | pflegt `infratech-2027-liste.html` |

## 2. Empfohlene Rollen (eine Quelle pro Zweck)
- **Messe-Aufgaben & Status → Notion-Datenbank „Aufgaben InfraTech 2027“**, gepflegt direkt oder über Cockpit A1 (Entscheidung 21.10.2026).
- **Messe-Übersicht (Hotels, Giveaways, Fristen, Stand) → Messe-Hub `messe-hub.html`**; Aufgaben dort nur als Fristen, keine eigene Liste.
- **Messe-Steuerung (Budget, KPIs, Fristenmatrix, Lessons, Faktencheck) → Cockpit-Artefakt.**
- **Vorlagen/Dokumente (A–E, PDFs) → Repo.**
- **ClickUp:** stillgelegt (Liste als „[ARCHIV] …“ umbenannt). **Notion:** Wissens-Hub und führende Messe-Aufgabenquelle (siehe B2/B3).

## 3. Blinde Flecken (priorisiert)

| # | Fund | Schwere | Status / Empfehlung |
|---|---|---|---|
| **B1** | Innovationspreis-Frist (25.09.2026). | ✅ erledigt | Fristgerecht eingereicht; Status: warten auf Rückmeldung. |
| **B2/B3** | **Mehrere Aufgaben-Systeme** (Sheet, Cockpit, ClickUp, Notion, Checkliste). | ✅ entschieden | Rollen fixiert (siehe Abschnitt 5): **ClickUp stillgelegt**, Notion **Wissens-Hub und seit 21.10.2026 führende Messe-Aufgabenquelle**. |
| **B4** | **Verbindliche 2027-Ahoy-Fristen** – jetzt aus Handbuch V1.3 belegt (Notion-Hub). | ✅ teils geklärt | In Abschnitt 6 übernommen; verbleibend: Bauhöhe/Bodenlast/Maschinenregeln aus Ahoy-Portal. |
| **B9** | **Stand 5.209** | ✅ erledigt | Buchung für Rotterdam 2027 bestätigt (vermerkt 02.10.2026). Offen bleibt nur: 2027-Handbuch und Portalzugang (Aufgabe s1). |
| **B10** | **Owner/Projektleitung 2027** | ✅ erledigt | **David Halko (Marketing Manager)**, bestätigt 29.09.2026. |
| **B5** | PR #13 und PR #22 gemergt. | ✅ erledigt | – |
| **B6** | **Team-Zugriff aufs Cockpit** – Artefakt ist privat (nur David). | 🟡 mittel | Bei Bedarf über „Teilen" freigeben (Team-Tab existiert im Cockpit). |
| **B7** | **Agent-Automatik ohne Connector** – die Wochen-Routine konnte Sheet/db nicht selbst lesen. | 🟡 mittel | Charter + Routine ergänzt (liest die Notion-Datenbank read-only, meldet Deltas; bis 21.10.2026 das Sheet). |
| **B8** | **Standnummer 2027** | ✅ erledigt | Stand 5.209 (Buchung bestätigt, siehe B9). |

## 4. Zuletzt verbessert (dieser Durchlauf)
- Apps-Script **erkennt Tab/Kopfzeile/Spalten automatisch** (Tab-Name muss nicht bekannt sein) + Menüpunkt „Erkannten Aufgaben-Tab anzeigen".
- Sheet-Integration als **Paket A** dokumentiert (Live-Tab + idempotenter Import).
- **Optionales abgegrenzt & angebunden:** der Manager-Agent liest im Wochencheck das Sheet (read-only) und meldet Abweichungen zum Cockpit – klar getrennt vom Live-Betrieb im Sheet.
- Diese **Systemübersicht** als zentrale Landkarte.

## 5. Konsolidierungs-Entscheidung (B2/B3 – umgesetzt)
Nach Prüfung der tatsächlichen Inhalte gilt „eine Quelle pro Zweck":

| System | Entscheidung | Rolle ab jetzt |
|---|---|---|
| **Google Sheet** | behalten | Team-Aufgaben außerhalb der Messe; für InfraTech abgelöst durch Notion (21.10.2026) |
| **Notion** | **behalten** | Wissens- & Entscheidungs-Hub **und** führende Messe-Aufgabenquelle (DB „Aufgaben InfraTech 2027“, Stand 21.10.2026) |
| **Cockpit-Artefakt** | behalten | Visuelle Messe-Übersicht (KPIs, Budget, Faktencheck) |
| **ClickUp** | **stillgelegt** | Redundanter dritter Task-Speicher; einzigartige Tickets übernommen, Liste als „[ARCHIV] …“ umbenannt |
| **Checkliste-Artefakt** | ins Cockpit übernommen | Inhalt 1:1 im Cockpit-Reiter „Checkliste 26→27“ (Klarnamen Dritter ausgenommen); Original = Archiv |

**Übernommen aus ClickUp/Notion** (damals in den Sheet-Import bzw. die Fristen eingearbeitet): Owner benennen, Stand-5.209-Klärung, ILB-Förderung, DSV-VRS-Slots, Dienstleister-Register-Check, Standpersonal festlegen, Standentwurf-Frist 15.11.2026.

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
1. ~~B9 – Stand 5.209 klären~~ → erledigt: Buchung bestätigt. Nächster Schritt: 2027-Handbuch und Portalzugang anfordern (Aufgabe s1).
2. ~~B10 – Owner benennen~~ → erledigt: David Halko (Marketing Manager).
3. ~~ClickUp stilllegen~~ → erledigt: Liste als „[ARCHIV] …“ umbenannt (siehe `cockpit-a1/README.md`).
