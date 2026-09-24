---
name: tender-monitoring
description: Findet und bewertet öffentliche Ausschreibungen für Fräsarbeiten (TED, service.bund.de, Vergabemarktplatz Brandenburg, Portale MV und Norddeutschland) nach CPV-Codes, prüft die Eignung und führt die Fristen-Ampel im Marketing Cockpit. Greift bei „Ausschreibungen suchen“, „neue Vergaben“, „Tender-Check“, „passt die Ausschreibung“, „Eignung prüfen“, „Fristen Ausschreibungen“, „welche Abgaben sind rot“, „CPV 45233“, „Vergabeportal durchsuchen“ oder „Ausschreibung verwerfen/übernehmen“.
---

# Tender-Monitoring – Ausschreibungen finden, prüfen, verfolgen

## Zweck

Du suchst öffentliche Ausschreibungen, die zu den Leistungen der Fräsdienst-Service
E. Feind GmbH passen (Kaltfräsen von Asphalt und Beton), bewertest die Eignung und führst
sie in der Sammlung `tenders` des Artefakt-Speichers. Verbindliches Datenmodell:
`kontext/datenmodell.md`.

Dashboard-URL: `{{DASHBOARD_URL}}`

## Quellen

Bewertungen und Fristenübersichten legst du auf Wunsch in `Marketing/Ausschreibungen/` ab;
die Vergabeunterlagen selbst bleiben im Vertrieb und werden nicht in diesen Ordner kopiert.

| Portal | Zugang | Status |
|---|---|---|
| TED – Tenders Electronic Daily | https://ted.europa.eu (Expertensuche; Such-API der EU) | bekannt; API-Endpunkt und Abfragesyntax vor Nutzung in der TED-Dokumentation prüfen |
| service.bund.de | https://www.service.bund.de (Rubrik Ausschreibungen) | bekannt |
| Vergabeplattform des Bundes (e-Vergabe) | https://www.evergabe-online.de | zu verifizieren |
| Vergabemarktplatz Brandenburg | https://vergabemarktplatz.brandenburg.de | zu verifizieren |
| Vergabeportal Mecklenburg-Vorpommern | URL | zu verifizieren |
| Weitere Norddeutschland (Schleswig-Holstein, Niedersachsen, Hamburg, Sachsen-Anhalt) | Landesportale bzw. Plattformbetreiber | zu verifizieren |

Kennzeichne jede Portal-URL, die du nicht in der laufenden Sitzung aufgerufen und bestätigt
hast, im Ergebnis als „zu verifizieren“. Bevorzuge offizielle Portale; Aggregatoren nur als
Hinweisquelle, der Datensatz verweist auf die Originalbekanntmachung.

## CPV-Codes (Suchbasis)

| CPV | Bezeichnung (Kurzform) |
|---|---|
| 45233000 | Bauarbeiten für Straßen, Oberbau |
| 45233220 | Straßenbelagsarbeiten |
| 45233223 | Erneuerung des Fahrbahnbelags |
| 45233200 | Diverse Belagsarbeiten |
| 45233140 | Straßenbauarbeiten |
| 45111300 | Abbrucharbeiten |
| 45262000 | Spezialbauarbeiten (nur mit Stichwort „Fräsen“ relevant) |

Die Liste ist ein Arbeitsstand. Prüfe Codes und Bezeichnungen gegen die offizielle
CPV-Liste (Verordnung (EG) Nr. 213/2008, abrufbar über SIMAP/TED), bevor du sie als
Suchfilter festschreibst. Ergänze die Suche immer um Freitext: `Fräsen`, `Fräsarbeiten`,
`Kaltfräsen`, `Asphalt fräsen`, `Deckschicht`, `Fahrbahnerneuerung`.

## Arbeitsablauf

1. `ArtifactData get` auf `settings/general` → `tenderRedDays` (Standard 3),
   `tenderYellowDays` (Standard 7), `regions`.
2. `ArtifactData list` auf collection `tenders` → bekannte IDs und URLs, um Dubletten zu
   vermeiden.
3. Suche je Portal mit CPV-Codes, Freitext und Regionsfilter (NUTS bzw. Bundesland laut
   `regions`). Nur Bekanntmachungen mit Angebots- oder Teilnahmefrist in der Zukunft.
4. Erfasse je Treffer: `title`, `authority` (Vergabestelle als Organisation, keine
   Personen), `cpv` (Liste), `region`, `deadline` (`JJJJ-MM-TT`), `portal`, `url`
   (Originalbekanntmachung), `foundAt` (heute), `source` (z. B. `"TED-Suche 2026-09-24"`).
5. Führe den Eignungs-Check durch und setze `fit` und `fitReason`.
6. Setze `status: "neu"` für neue Treffer; bestehende Datensätze nur per `update`
   (Status, Frist bei Änderungsbekanntmachung).
7. Schreibe alles in einem `ArtifactData batch` (`set` neu, `update` geändert).
8. `ArtifactData update` auf `meta/sync`, Feld `tenders: { at, source }` mit den durchsuchten Portalen.
9. Gib die Ergebnisliste mit Fristen-Ampel aus.

Wiederkehrende Suchen: Nutze `ArtifactData query` auf `tenders` mit Filter `status` in
(`neu`, `in_pruefung`, `angebot`), um laufende Vorgänge und Fristen zu prüfen.

## Eignungs-Check

Bewerte vier Kriterien; `fit` ergibt sich so: alle passen → `passt`; ein Kriterium unklar →
`pruefen`; ein Kriterium klar nicht erfüllt → `passt_nicht`. `fitReason` nennt die
Kriterien knapp, z. B. `"Leistung Fräsen Deckschicht; Region LDS; Frist ok; Maschinenbedarf offen"`.

1. **Leistung**: Fräsarbeiten sind Haupt- oder klar abgrenzbarer Teil der Leistung
   (eigenes Los oder Nachunternehmerleistung für Bieter). Reine Gesamtbauleistungen
   ohne Fräsanteil → `passt_nicht`.
2. **Region**: Ausführungsort in `settings/general.regions`.
3. **Termin**: Ausführungszeitraum und Angebotsfrist sind erreichbar.
4. **Maschinenbedarf**: Frästiefe, Fräsbreite, Flächen- oder Mengenangaben mit dem
   Maschinenpark abgleichen – **nur** mit Daten aus bestätigtem Kontext
   (`kontext/unternehmen.md` oder Aussage von David). Fehlen diese Daten, bleibt das
   Kriterium „unklar“ und `fit` höchstens `pruefen`.

Eignungsnachweise, Präqualifikation (z. B. PQ-VOB) und Referenzanforderungen nur als
Hinweis nennen; ob sie erfüllt sind, entscheidet David.

## Fristen-Ampel

Tage bis `deadline` (Kalendertage ab heute):

* rot: ≤ `tenderRedDays` (Standard 3)
* gelb: ≤ `tenderYellowDays` (Standard 7)
* grün: sonst

Abgelaufene Fristen mit Status `neu` oder `in_pruefung` meldest du und schlägst
`verworfen` vor – setzen nur nach Bestätigung.

## Vertraulichkeit und Recht

* Vergabeunterlagen (Leistungsverzeichnis, Pläne, Bieterfragen und -antworten) sind
  vertraulich. Übernimm aus ihnen keine Inhalte in `db`, Content oder Exporte; im Datensatz
  stehen nur Daten der öffentlichen Bekanntmachung.
* Keine Preise, Einheitspreise oder Kalkulationen in `db`.
* Keine Personennamen der Vergabestelle, nur die Behörde als Organisation.
* Fragen zu Vergaberecht, Fristberechnung im Streitfall, Eignungsleihe, Bietergemeinschaft,
  Nachunternehmereinsatz oder Rügen: „Bitte Rechtsabteilung prüfen.“

## Qualitäts-Checks

* Jeder Treffer hat eine direkt aufrufbare `url` zur Originalbekanntmachung.
* `deadline` aus der Bekanntmachung übernommen, nicht geschätzt; Uhrzeit ggf. in
  `fitReason` vermerken.
* Keine Dubletten (gleiche Bekanntmachungsnummer oder URL).
* Portale, die nicht erreichbar waren, im Ergebnis nennen.

## Ausgabeformat

```
Ausschreibungen – Suche <Datum> (Portale: TED, service.bund.de, ...)
| Ampel | Frist | Titel | Vergabestelle | Region | CPV | fit | Grund | Link |
Neu: 4 | aktualisiert: 1 | verworfen vorgeschlagen: 2
Nicht erreichbar / zu verifizieren: <Portale>
Rückfragen an David: <z. B. Maschinenbedarf Frästiefe 12 cm>
```

## Grenzen

* Du gibst keine Angebote ab und registrierst dich nicht auf Portalen.
* Keine Aussagen zur Leistungsfähigkeit des Maschinenparks ohne bestätigten Kontext.
* Portal-Zugänge und Passwörter nie speichern oder in Dateien schreiben.
