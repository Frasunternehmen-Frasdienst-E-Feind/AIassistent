# Kategorisierung & Integration des MANUS-Exports

Analyse des Stapeldownloads `MANUS_Stapeldownload_Infratec2027.zip` (21 Dateien) und Plan,
wie die Inhalte die bestehende „ToDo-Liste InfraTech 2027" ergänzen.

## 1. Kategorien der MANUS-Inhalte

| Kategorie | Dateien | Beitrag zur Liste |
|---|---|---|
| **Strategie & Steuerung** | Executive Summary, Dashboard, Projektgrundgerüst | Zielbild, KPIs, Arbeitspakete, Meilensteine (T-12M … T+14d), Kommunikationsplan, Sprint 1 → **neue Tabs Dashboard / Ziele & KPIs**; P0-Aufgaben in Bereich „Steuerung & Fristen". |
| **Analyse / Lessons Learned** | Inhaltsanalyse 2026, Auswertung (Volltext) | 10 priorisierte Erkenntnisse (E1–E10), Risikoregister, Kosten- & Besucherbaseline → **Tab Lessons Learned**, Packlisten- und Standbau-Empfehlungen als Aufgaben-Notizen. |
| **Fristen** | Overview Deadlines D/E | Deadline-Referenz 2026 (Standentwurf 21.11., Bestellungen 01.12., Grafik 12.12., Teppich/Möbel 06.01.) → **Tab Fristen** (als „2027 verifizieren" markiert). |
| **Standbau & Logistik** | Ausstellerhandbuch, Standbauhandbuch | Regeln zu Aufbau/Abbau, Tor 1 + Kaution 200 €, kein eigener Stapler/Kran, DB Schenker → Aufgaben in „Standbau" und „Logistik". |
| **Marketing / Print** | Werben im Messekatalog | Anzeigen-/Logo-/PR-Optionen → Aufgabe „Anzeigenoptionen 2027 bewerten". |
| **Budget** | Auswertung (Kostenblatt), Projektgrundgerüst | Baseline 21.023 € + Planrahmen 24.200–26.500 € → **Tab Budget**. |
| **Leads / CRM** | Standbesucher (Volltext) | Struktur & Prozess (Pflichtfelder, A/B/C, Follow-up) → Aufgaben „Leads & CRM". **Personenbezogene Daten NICHT übernommen** (DSGVO / CLAUDE.md). |
| **Inventar / Metadaten** | Inventar-MD, CSV, JSON, `_file_metadata.json` | Übersicht der 9 Quelldateien → **Tab Wissensbasis**. |
| **Vorlagen / Skills / Skripte** | `SKILL.md` (technical-writing), `analyze_files.py`, `export_*.py`, `pasted_content.txt` | Manus-interne Werkzeuge/Prompt – **nicht** in die Liste übernommen; `pasted_content` (PM-Setup-Prompt) diente als Strukturvorlage. |

## 2. Wie die Inhalte die bestehende Liste ergänzen

Die bisherige „ToDo-Liste InfraTech 2027" war eine gute **operative Checkliste** (12 Abschnitte),
aber ohne Strategie, Termine, Budget, KPIs und ohne die Lehren aus 2026. Der MANUS-Export liefert
genau diese fehlenden Ebenen. Zusammengeführt entsteht ein **Cockpit** mit:

- operativen Aufgaben (bisherige Liste + Checklisten A–E), **kategorisiert** mit Owner, Priorität, Termin;
- **Terminlogik** (Countdown, überfällig/bald, Fristenmatrix);
- **Steuerungsebene** (Dashboard-Ampel je Bereich, KPIs, Budget);
- **Erfahrungswissen** (Lessons Learned als Maßnahmen);
- **Qualitätssicherung** (Faktencheck-Marker „Fakt prüfen" / „Recht prüfen").

## 3. Konflikte, die beim Zusammenführen aufgefallen sind

| Punkt | Alte ToDo | MANUS / Faktencheck | Behandlung |
|---|---|---|---|
| Messedatum | 12.–14.01.2027 | **12.–15.01.2027** (offiziell) | Korrigiert, im Dashboard als Warnung markiert. |
| Innovationspreis | 31.10.2026 | **25.09.2026** (Faktencheck) | Als kritische Warnung markiert, Aufgabe P0 mit „Fakt prüfen". |
| Hotels | 5 Häuser gleichwertig | Nur ibis Styles fußläufig | Korrektur + nahe Alternativen im Faktencheck-Tab. |
| Dienstleister | — | 2 verifiziert, 3 unklar/1 nicht auffindbar | „Fakt prüfen"-Marker an Standbau-Aufgabe. |

## 4. Bewusst nicht übernommen

- Personenbezogene Lead-/Kontaktdaten Dritter (Datenschutz).
- Manus-eigene Skills/Skripte (technische Hilfsmittel ohne fachlichen Listeninhalt).
- Absolute Preis-/Terminangaben aus 2026-Marketingunterlagen (nur als Entscheidungsgrundlage).
