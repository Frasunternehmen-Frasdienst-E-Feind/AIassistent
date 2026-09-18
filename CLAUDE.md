# AIassistent – Arbeitsregeln für dieses Repository

## Sprache und Form
Antworten und Commit-Messages auf Deutsch. Fachbegriffe der Zeitwirtschaft
(Ist, Soll, Saldo, Kommen/Gehen, Pause) so verwenden, wie sie in OptiTime und in
der Lohnabrechnung stehen.

## Corporate Design (verbindlich für Artefakte, Dashboards, Präsentationen)
Farben, Schriften, Radien und Abstände stehen in `branding/feind-ci.tokens.json`
und sind die einzige Quelle – keine eigenen Paletten erfinden, keine Farbwerte
im Markup hart setzen.

* Grün `#84bb20` ist Akzent- und Flächenfarbe. Auf Grün steht Anthrazit
  `#424e4e`, nie Weiß.
* Grün nie als Textfarbe auf hellem Grund (2,3:1) – dort `accent-text` `#5e8a14`.
* Rot `#e3000b` ausschließlich als Signal (Fehler, Fehlbuchung, Minus), nie als
  Schmuckfarbe und auf dunklem Grund nur als Fläche.
* Schrift: Display `Exo`, Text `Helvetica Neue / Helvetica / Arial`.
* Radien nahe 0 (Eingaben 2 px, Buttons 4 px), Abstände aus der Skala
  4 / 8 / 16 / 24 / 40 / 64.
* Immer beide Themes ausliefern: hell auf `:root`, dunkel zusätzlich über
  `@media (prefers-color-scheme: dark)` mit `:root:not([data-theme="light"])`
  und über `:root[data-theme="dark"]`.

## Zeitwirtschaft – fachliche Regeln
* Arbeitszeit = Summe der Arbeitsbuchungen ohne Pausen.
* Tages-Soll = Wochenstunden / Anzahl Arbeitstage; Soll wird nur für Tage
  gerechnet, an denen Buchungen vorliegen (Urlaub und Krankheit bleiben neutral).
  Aktuell hinterlegt: 40 h auf Mo–Fr, also 8:00 pro Tag – Änderungen im
  Artefakt unter „Soll-Zeiten“, nicht im Code.
* Pausenprüfung nach ArbZG §4: über 6 h Arbeitszeit 30 Minuten, über 9 h
  45 Minuten. Abweichungen werden angezeigt, nicht automatisch korrigiert.
* Buchungen ohne Gehen-Zeit gelten als offener Tag und werden nicht
  hochgerechnet.
* Bei arbeitsrechtlichen oder vertraglichen Fragen (Pausenfehlbeträge,
  Mehrarbeitskonto, Abgeltung): **bitte Rechtsabteilung prüfen.**

## Datenschutz
Nur eigene Personaldaten (Personalnummer 1626) verarbeiten. Keine Buchungen,
Namen oder Kontaktdaten Dritter in Repository, Artefakte oder Exporte
übernehmen. Zugangsdaten gehören nicht in versionierte Dateien.

## Artefakt „Arbeitszeitkonto 1626“
https://claude.ai/artifact/7Uvmb6GjyHjfwzo5TtmXmQ

Datenhaltung im Artefakt-Speicher (`db`), nicht im HTML:

* `days/<JJJJ-MM-TT>` = `{ date, books: [{ start, end, kind: "work"|"pause" }],
  origin: "export"|"import"|"manuell", note }`
* `settings/general` = `{ weekHours, workdays: [1..5], seeded: true }`

Der im HTML eingebettete Stand vom 14.09.2026 ist nur Notfall-Anzeige und
Erstbefüllung. Neue Buchungen kommen über „Buchungen importieren“
(`Datum;Von;Bis;Art`) in die Seite – dafür ist keine Änderung am Code nötig.
