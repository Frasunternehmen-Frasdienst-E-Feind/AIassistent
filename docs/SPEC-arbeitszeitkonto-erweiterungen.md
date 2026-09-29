# Spec: Erweiterungen Arbeitszeitkonto 1626

Stand 29.09.2026 · Ergebnis der Planungsrunde (grill-me) mit David ·
Artefakt: https://claude.ai/artifact/7Uvmb6GjyHjfwzo5TtmXmQ

Drei Funktionen, umgesetzt in dieser Reihenfolge:

1. Monatsexport als CSV (Tagesübersicht)
2. Mehrarbeitskonto: Monatsverlauf
3. Tagesarten und Urlaubsplanung

**Fett markiert** sind Annahmen, die noch bestätigt werden müssen (Liste in
Abschnitt 6). Rechenregeln aus `CLAUDE.md` („Zeitwirtschaft – fachliche Regeln“)
gelten unverändert, sofern hier nichts anderes steht.

---

## 0. Grundlagen

| Punkt | Festlegung | Quelle |
| --- | --- | --- |
| Beginn Arbeitsverhältnis | 17.08.2026; Konto startet dort bei 0:00, kein Übertrag | Arbeitsvertrag § 1 |
| Wochenarbeitszeit | 40 h auf Mo–Fr (8:00/Tag), bleibt wie hinterlegt | Entscheidung David; **BO C § 1 nennt 41 h – offen** |
| Mehrarbeit | mit dem Gehalt abgegolten; Übersicht dient nur der Dokumentation | Arbeitsvertrag § 4 Abs. 2 – **bitte Rechtsabteilung prüfen** |
| Ausschlussfrist | 3 Monate ab Fälligkeit, Textform | Arbeitsvertrag § 6 – **bitte Rechtsabteilung prüfen** |
| Arbeitszeitkonto nach BO | gilt laut BO C § 3 nur für gewerbliche Mitarbeiter | Betriebsordnung 06/2020 |
| Urlaub | 30 Arbeitstage/Jahr, Eintrittsjahr anteilig, 24.12./31.12. je 1 Urlaubstag, Betriebsruhe = Urlaub, Rest bis 31.03. | BO F § 1 |

Nachtrag bereits erledigt: `days/2026-08-17` = 08:00–16:00 Arbeitszeit ohne
Pause, `origin: "manuell"` (Angabe David, 28.09.2026). Das Artefakt meldet dafür
„Pause fehlt (30 min)“ – Anzeige, keine Korrektur.

Nicht in das Repository: Arbeitsvertrag und Betriebsordnung selbst (enthalten
personenbezogene Daten). Hier stehen nur die für die Rechnung nötigen Regeln.

---

## 1. Monatsexport CSV

### Bedienung
- Das bestehende Fenster „CSV“ bekommt oben eine Umschaltung:
  **Tagesübersicht** (neu, Standard) | **Buchungen (Importformat)** (bestehend,
  unverändert – dient als Sicherung und lässt sich wieder importieren).
- Tagesübersicht: Auswahlfeld **Monat**, vorbelegt mit dem aktuellen Monat,
  angeboten werden nur Monate mit Einträgen.
- Buttons: **Herunterladen** (primär) und **In die Zwischenablage**.

### Datei
- Name: `Arbeitszeit_1626_JJJJ-MM.csv`
- UTF-8 **mit BOM**, Trennzeichen Semikolon, Zeilenende CRLF (Excel/Windows).
- Download über die bereits deklarierte Fähigkeit `downloads`
  (`downloads.save({filename, data})`); ist sie nicht verfügbar, bleibt nur die
  Zwischenablage sichtbar.

### Zeilen
- Jeder Arbeitstag (laut `settings.workdays`) des Monats, auch ohne Einträge.
- Zusätzlich jeder andere Tag (z. B. Samstag), an dem Buchungen vorliegen.
- Tage nach heute werden nicht ausgegeben, außer sie haben eine Tagesart
  (verplanter Urlaub).
- Tage vor dem 17.08.2026 werden nicht ausgegeben.
- Letzte Zeile: Summenzeile `Summe` über Ist, Pause, Soll, Saldo.

### Spalten
`Datum;Wochentag;Kommen;Gehen;Ist;Pause;Soll;Saldo;Status`

| Spalte | Format | Inhalt |
| --- | --- | --- |
| Datum | `JJJJ-MM-TT` | |
| Wochentag | `Mo` … `So` | |
| Kommen | `HH:MM` | Beginn der ersten Buchung, sonst leer |
| Gehen | `HH:MM` | Ende der letzten Buchung; leer bei offenem Tag |
| Ist, Pause, Soll, Saldo | Dezimalstunden, Komma, 2 Stellen (`9,53`, `-0,25`) | Minuten / 60, kaufmännisch gerundet; Summen aus Minuten, nicht aus gerundeten Werten |
| Status | Text | siehe unten |

Status-Werte (mehrere mit ` / ` verbunden):
`vollständig`, `offen`, `kein Kommen`, `Pause < 30 min`, `Pause < 45 min`,
`keine Buchung`, `Urlaub`, `Urlaub (halber Tag)`, `Sonderurlaub`, `Krank`,
`Feiertag`, `Gleittag`.

Tage ohne Buchung und ohne Tagesart: Kommen/Gehen/Ist/Pause leer,
Soll `0,00`, Saldo `0,00`, Status `keine Buchung` (Soll nur für Tage mit
Buchungen, siehe CLAUDE.md).

### Beispiel
```
Datum;Wochentag;Kommen;Gehen;Ist;Pause;Soll;Saldo;Status
2026-09-10;Do;06:58;16:53;9,53;0,38;8,00;1,53;vollständig
2026-09-14;Mo;06:48;;7,82;0,33;8,00;-0,18;offen
2026-09-15;Di;;;;;0,00;0,00;keine Buchung
Summe;;;;17,35;0,71;16,00;1,35;
```

### Abnahme
- Zahlen je Tag identisch mit der Wochentabelle im Artefakt.
- Datei öffnet sich in Excel (Deutsch) per Doppelklick mit Umlauten und
  getrennten Spalten; `=SUMME()` über Saldo ergibt den Summenwert.

---

## 2. Mehrarbeitskonto – Monatsverlauf

- Neue Karte **„Mehrarbeitskonto“** direkt unter den Kennzahlen.
- Tabelle, neuester Monat oben:
  `Monat · Stand Vormonat · Plus/Minus im Monat · Stand Monatsende`
- Beginn August 2026, Stand Vormonat August = 0:00.
- Plus/Minus im Monat = Summe der Tagessalden des Monats (dieselbe Rechnung
  wie Wochentabelle und Export). Enthält der Monat einen offenen Tag, trägt die
  Zeile den Hinweis „vorläufig“.
- Darstellung H:MM mit Vorzeichen; Plus in `accent-text`, Minus in
  `signal-text`.
- Hinweis unter der Tabelle:
  „Laut Arbeitsvertrag § 4 Abs. 2 ist Mehrarbeit mit dem Gehalt abgegolten; die
  Übersicht dient der Dokumentation. Bitte Rechtsabteilung prüfen.“
- Nicht enthalten: Obergrenze, Verfall, Auszahlung, Vermerk „dokumentiert am“.

---

## 3. Tagesarten und Urlaubsplanung

### Tagesarten

| `type` | Anzeige | Soll | Zählt gegen Urlaubsanspruch |
| --- | --- | --- | --- |
| `urlaub` | Urlaub | 0:00 | 1 Tag |
| `urlaub_halb` | Urlaub (halber Tag) | halbes Tages-Soll (4:00) | 0,5 Tage |
| `sonderurlaub` | Sonderurlaub | 0:00 | nein |
| `krank` | Krank | 0:00 | nein |
| `feiertag` | Feiertag | 0:00 | nein |
| `gleittag` | Gleittag | volles Tages-Soll (8:00), Ist 0:00 → Saldo −8:00 | nein |

- **`gleittag` ist standardmäßig ausgeblendet** (`settings.general.gleittag =
  false`) und erst nach Bestätigung durch die Personalabteilung einschaltbar.
- Ein Tag mit Tagesart kann zusätzlich Buchungen haben (z. B. halber
  Urlaubstag + Arbeit). Ist-Zeit wird normal gerechnet.
- Pausenprüfung (ArbZG § 4) unverändert, nur für gebuchte Arbeitszeit.

### Urlaubsanspruch
- Unter „Soll-Zeiten“ je Jahr ein Feld **Urlaubsanspruch (Tage)**, voreingestellt
  auf 30 für 2026 und 2027; weitere Jahre werden bei Bedarf ergänzt.
- **Der Wert für 2026 ist vorläufig** – anteiliges Eintrittsjahr und
  Probezeit-Regel (BO F § 1 Abs. 6 und 10) klärt die Personalabteilung.
  Das Artefakt rechnet den Anspruch nicht selbst aus.
- Anzeige je Jahr: **Anspruch · verplant · genommen · Rest**
  - verplant = Urlaubstage mit Datum nach heute
  - genommen = Urlaubstage bis einschließlich heute
  - Rest = Anspruch − verplant − genommen (negativ → Signalfarbe)
- Hinweise unter „Zu klären“:
  - 24.12. und 31.12. ohne Tagesart, wenn Arbeitstag: „Laut BO gilt der Tag
    als Urlaubstag“ mit Button „als Urlaub eintragen“. Keine automatische
    Buchung.
  - Resturlaub > 0 ab 15.11.: „Antrag auf Resturlaub bis 15.11. stellen (BO F
    § 1 Abs. 4)“.

### Feiertage Brandenburg
- Werden **berechnet**, nicht hart kodiert (Osterdatum nach Gauß; feste Tage).
- Brandenburg: Neujahr, Karfreitag, Ostersonntag, Ostermontag, 1. Mai,
  Christi Himmelfahrt, Pfingstsonntag, Pfingstmontag, 3. Oktober,
  Reformationstag (31.10.), 1. und 2. Weihnachtstag.
- Das Artefakt schlägt Feiertage, die auf Arbeitstage fallen, in der
  Jahresübersicht vor („übernehmen“); gespeichert wird erst nach Klick.
- Kontrollwerte: 2026 → Ostersonntag 05.04., Himmelfahrt 14.05.,
  Pfingstsonntag 24.05.; 2027 → Ostersonntag 28.03., Himmelfahrt 06.05.,
  Pfingstsonntag 16.05.

### Erfassung
1. **Tag erfassen / bearbeiten:** neues Auswahlfeld „Tagesart“ (leer =
   normaler Arbeitstag). Buchungen sind dann optional.
2. **Buchungen importieren:** Zeilen ohne Uhrzeit werden als Tagesart gelesen:
   `2026-12-24;;;Urlaub`. Erkennung per Stichwort in Art/Tätigkeit
   (Groß-/Kleinschreibung egal):
   `halb` + `urlaub` → `urlaub_halb`, `sonder` oder `000004` → `sonderurlaub`,
   `urlaub` → `urlaub`, `krank` → `krank`, `feiertag` → `feiertag`,
   `gleit` → `gleittag`. Unbekannte Zeile ohne Uhrzeit → Fehlermeldung mit
   Zeilennummer, nichts wird übernommen.
3. Führend für Urlaub und Abwesenheiten ist **OptiTime**; das Artefakt
   übernimmt und zeigt an. **Genaues Exportformat aus OptiTime noch offen**
   (Screenshot/Beispielzeilen von David ausstehend).

### Datenmodell (Artefakt-Speicher `db`)
Bestehende Dokumente bleiben gültig, alle neuen Felder sind optional.

```
days/<JJJJ-MM-TT> = {
  date, books: [{ start, end, kind: "work"|"pause" }],
  origin: "export"|"import"|"manuell", note,
  type?: "urlaub"|"urlaub_halb"|"sonderurlaub"|"krank"|"feiertag"|"gleittag"
}
settings/general = {
  weekHours, workdays: [1..5], seeded: true,
  vacation?: { "2026": 30, "2027": 30 },
  gleittag?: false
}
```

`CLAUDE.md` (Abschnitt „Artefakt“) wird mit der Umsetzung um `type`,
`vacation` und `gleittag` ergänzt.

---

## 4. Arbeitspakete

| Nr. | Paket | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| AP1 | Tagesübersicht-Berechnung als Funktion (Monat → Zeilen + Summe), nutzt `statOf` | – | Zahlen = Wochentabelle |
| AP2 | CSV-Fenster: Umschaltung, Monatsauswahl, Download (BOM/CRLF), Zwischenablage | AP1 | Excel-Test |
| AP3 | Karte „Mehrarbeitskonto“ mit Monatsverlauf | AP1 | Summe aller Monate = Kennzahl „Kontostand“ |
| AP4 | Datenmodell `type`, Soll-Regeln je Tagesart in `statOf`/`sollFor` | – | bestehende Tage unverändert |
| AP5 | Formular „Tagesart“ + Import ohne Uhrzeit | AP4 | Importbeispiele aus Abschnitt 3 |
| AP6 | Urlaubsanspruch in „Soll-Zeiten“, Jahresübersicht Anspruch/verplant/genommen/Rest | AP4 | Rechnung von Hand nachgeprüft |
| AP7 | Feiertage BB berechnen + Vorschlag; Hinweise 24.12./31.12. und 15.11. | AP4, AP6 | Kontrollwerte oben |
| AP8 | Monatsexport und Bericht/PDF zeigen Tagesarten | AP2, AP4 | Status-Spalte |
| AP9 | `CLAUDE.md` Datenmodell nachziehen | AP4, AP6 | – |

Umsetzung im Artefakt nach CI (`branding/feind-ci.tokens.json`), beide Themes.
Vor dem Republish: Artefakt-Stand lesen, Speicher (`db`) wird nicht
überschrieben – neue Felder nur ergänzen.

---

## 5. Risiken

- **Falsche Soll-Basis (40 statt 41 h):** jede Zahl weicht um 0:12/Tag ab →
  Wochenstunden bleiben Einstellung, nicht Code.
- **Urlaubsanspruch 2026 unklar:** Rest-Anzeige kann zu hoch sein → Wert ist
  von Hand gepflegt und als vorläufig markiert.
- **OptiTime-Format unbekannt:** Import per Stichwort, unbekannte Zeilen werden
  abgewiesen statt geraten.

## 6. Offene Punkte / benötigte Bestätigungen

| Nr. | Frage | Wer | Wirkung |
| --- | --- | --- | --- |
| O1 | 40 oder 41 h/Woche für Angestellte? | Personalabteilung | `weekHours` |
| O2 | Urlaubsanspruch 2026 (anteilig, Probezeit, 24./31.12.) | Personalabteilung / **bitte Rechtsabteilung prüfen** | `vacation.2026` |
| O3 | Gibt es Gleittage für David? | Personalabteilung | `gleittag` ein/aus |
| O4 | Wo/wie exportiert OptiTime Urlaub und Abwesenheiten? | David (Screenshot, `OfflisteTaet.txt`) | Import-Stichwörter |
| O5 | Gilt die BO 06/2020 (Fräsdienst Enrico Feind e.K.) für die GmbH? | **bitte Rechtsabteilung prüfen** | Grundlage Urlaub/Arbeitszeit |
| O6 | 17.08.2026 ohne Pause bei 8 h – Folgen? | **bitte Rechtsabteilung prüfen** | nur Anzeige |
