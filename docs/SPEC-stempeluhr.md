# Feature-Spezifikation – Live-Stempeluhr für das Arbeitszeitkonto 1626

Stand: 2026-09-30 · Zielartefakt: „Arbeitszeitkonto 1626" (Artefakt-Speicher `db`) · Status: **Spec gesichert, Einbau als eigener Schritt offen**

## 1. Zweck

Das Arbeitszeitkonto kann Zeiten heute nur **importieren/einbetten** (`Buchungen importieren`,
Format `Datum;Von;Bis;Art`). Diese Spezifikation ergänzt eine **Live-Stempeluhr** –
Kommen / Pause / Gehen per Knopfdruck – als zusätzliche, gleichwertige Erfassungsart.
Herkunft der Idee: Vorstufe „Stundenzettel" (nie produktiv genutzt, `entries`-Collection leer;
Tagesdaten dort redundant zum kanonischen Konto). Portiert wird **nur** die Stempellogik,
abgebildet auf das bestehende `books/days`-Datenmodell – **keine neue Collection, keine Migration**.

## 2. Abgrenzung

* **Übernommen:** Zustandsautomat der Stempeluhr, Persistenz eines laufenden Stempels, UI-Karte.
* **Nicht übernommen:** das Freitext-Feld „Projekt / Auftrag" pro Eintrag. Begründung: gegenüber
  Tages-Soll, ArbZG-Pausenprüfung und Import ohne Funktion, in der Vorstufe nie befüllt. Bei
  späterem Bedarf additiv nachrüstbar, aber nicht Teil dieses Einbaus.

## 3. Datenmodell (unverändertes `days`-Schema nutzen)

Bestehend (CLAUDE.md): `days/<JJJJ-MM-TT>` = `{ date, books: [{ start, end, kind: "work"|"pause" }], origin, note }`.

Abbildung der Stempelvorgänge auf `books` – **ohne Schemaänderung**:

| Vorgang | Wirkung auf `days/<heute>.books` | `origin` |
|---|---|---|
| Einstempeln | neues `work`-Book `{ start: jetzt, end: null }` | `"manuell"` |
| Pause beginnen | offenes `work`-Book schließen (`end: jetzt`), neues `pause`-Book `{ start: jetzt, end: null }` | `"manuell"` |
| Pause beenden | offenes `pause`-Book schließen (`end: jetzt`), neues `work`-Book `{ start: jetzt, end: null }` | `"manuell"` |
| Ausstempeln | offenes Book schließen (`end: jetzt`) | `"manuell"` |

Ein **laufender Stempel** ist damit ausschließlich ein Book mit `end: null`. Das deckt sich mit der
bestehenden Regel „Buchung ohne Gehen-Zeit = offener Tag, wird nicht hochgerechnet".

### Laufender Stempel (Zeiger-Singleton, additiv)

Ein einzelnes Dokument hält den aktuellen Erfassungszustand geräteübergreifend:

`settings/live` = `{ status: "out"|"working"|"break", date: "<JJJJ-MM-TT>", since: <ISO>, updatedAt: <ISO> }`

* Per `onSnapshot` abonnieren → übersteht Reload/Gerätewechsel.
* Anzeige-Timer alle 30 s aktualisieren (Netto-Laufzeit); reiner Anzeigewert, keine Schreiblast.
* Quelle der Wahrheit für Zeiten bleiben die `books`; `settings/live` ist nur Zustandszeiger.

## 4. Zustandsautomat

```
out ──Einstempeln(→work offen)──▶ working
working ──Pause beginnen(work zu, pause offen)──▶ break
break ──Pause beenden(pause zu, work offen)──▶ working
working ──Ausstempeln(work zu)──▶ out
break   ──Ausstempeln(pause zu)──▶ out
```

Beim Ausstempeln offene Books immer schließen. Kein zweites Einstempeln, solange `status != "out"`.

## 5. UI (Stempel-Karte)

* Status-Punkt: grau = aus, grün (`--green #84bb20`) = arbeitet, Akzent = Pause.
* Netto-Laufzeit (Arbeitszeit ohne Pausen) live.
* Buttons je Zustand ein-/ausgeblendet: **Einstempeln** / **Pause beginnen** / **Pause beenden** / **Ausstempeln**.
* Corporate Design verbindlich: auf Grün steht Anthrazit `#424e4e` (nie Weiß); Grün als Text auf hell
  nur `--accent-text #5e8a14`; Rot `#e3000b` nur als Signal (z. B. „Stempel seit gestern offen");
  Display `Exo`, Radien Eingaben 2 px / Buttons 4 px; beide Themes ausliefern.
* Status nie allein über Farbe – immer zusätzlich Textlabel.

## 6. Integration mit Ist / Soll / Pausenprüfung

* **Arbeitszeit** = Summe der `work`-Books ohne Pausen (unverändert).
* Ein offener Tag (Book mit `end: null`) wird **nicht** hochgerechnet und **nicht** in Ist/Soll-Salden
  verrechnet, bis ausgestempelt ist. Doppelzählung eines laufenden Stempels ausschließen.
* **ArbZG §4-Pausenprüfung** (über 6 h → 30 min, über 9 h → 45 min) erst auf den **geschlossenen** Tag
  anwenden; am offenen Tag höchstens als Hinweis, nie als automatische Korrektur.
* Tages-Soll nur für Tage mit Buchungen; Urlaub/Krankheit bleiben neutral (unverändert).

## 7. Randfälle

* **Mitternachtsübergang:** ein über Mitternacht offener Stempel gehört fachlich klärend behandelt
  (Vorschlag: beim Ausstempeln auf Datumswechsel prüfen und ggf. am Vortag um 24:00 schneiden,
  Rest am Folgetag). Vor Einbau festlegen.
* **Verwaister offener Stempel** (Einstempeln ohne Ausstempeln über Tage): sichtbarer Signal-Hinweis,
  manuelles Schließen ermöglichen; nie stillschweigend hochrechnen.
* **Zeitzone:** lokale Kalendertage wie im übrigen Konto.

## 8. Aufwand & Risiko

* Aufwand: **M**. Risiko: **mittel** – offene Books greifen in Ist-/Soll-/Pausenlogik ein;
  Kernrisiko ist Doppelzählung/fehlerhafte Salden bei laufendem Stempel.
* Empfohlenes Vorgehen: Einbau als eigener, getesteter Schritt (Playwright-Prüfung beider Themes,
  Salden-Gegenrechnung offen vs. geschlossen), nicht innerhalb einer Aufräum-Aktion.

## 9. Datenschutz

Nur eigene Personaldaten (Personalnummer 1626). Keine Buchungen, Namen oder Kontaktdaten Dritter.
Bei arbeitsrechtlichen Fragen zu Pausenfehlbeträgen/Mehrarbeit: **bitte Rechtsabteilung prüfen.**

## 10. Referenz aus der Vorstufe „UI-Konzept"

Aus dem Onboarding-Mockup (Vorstufe „Zeitmanagement-Tool – UI-Konzept") ist – separat von dieser
Stempeluhr – ein Baustein aufhebenswert: **einmalige Datenschutz-Einwilligung + Soll-Zeit-Setzung
beim Erststart** (CD-konformes Wizard-Layout). Der volle 5-Schritt-Assistent ist für ein bereits
eingerichtetes Einzelkonto überdimensioniert und nicht Teil dieser Spec.
