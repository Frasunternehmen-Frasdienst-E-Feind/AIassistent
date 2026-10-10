# AIassistent – Arbeitsregeln für dieses Repository

## Sprache und Form
Antworten und Commit-Messages auf Deutsch. Fachbegriffe der Zeitwirtschaft
(Ist, Soll, Saldo, Kommen/Gehen, Pause) so verwenden, wie sie in OptiTime und in
der Lohnabrechnung stehen.

## Entscheidungen und Optionen (Wunsch von David, 30.09.2026)
* Optionen und Entscheidungen immer als **klickbare Auswahl** anzeigen (Werkzeug
  `AskUserQuestion`), nicht als Fließtext-Frage – das spart Zeit.
* Die aus Expertensicht beste Option steht immer **an erster Stelle** und trägt
  den Zusatz **„(Empfohlen)“**; die Beschreibung nennt kurz den Grund.
* Höchstens 4 Optionen je Frage, höchstens 4 Fragen auf einmal; „Sonstiges“ ergänzt
  das System selbst.

## Corporate Design (verbindlich für Artefakte, Dashboards, Präsentationen)
Farben, Schriften, Radien und Abstände stehen in `branding/feind-ci.tokens.json`
und sind die einzige Quelle – keine eigenen Paletten erfinden, keine Farbwerte
im Markup hart setzen.

* Grün `#84bb20` ist Akzent- und Flächenfarbe. Auf Grün steht dunkles
  Anthrazit `on-accent` `#263030` (5,9:1), nie Weiß; `#424e4e` erreicht auf Grün nur 3,7:1.
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
  origin: "export"|"import"|"manuell", note, type? }`
  * `type` (optional): `urlaub` (Soll 0, 1 Urlaubstag), `urlaub_halb` (halbes
    Tages-Soll, 0,5 Tage), `sonderurlaub`, `krank`, `feiertag` (je Soll 0),
    `gleittag` (volles Soll, Ist 0). Mit Tagesart dürfen `books` leer sein.
* `settings/general` = `{ weekHours, workdays: [1..5], seeded: true,
  vacation: { "2026": 30, "2027": 30 }, gleittag: false,
  autoIn: { on: false, from: "05:00", to: "10:00" } }`
  * `vacation` = Urlaubsanspruch je Jahr, von Hand gepflegt (2026 vorläufig,
    Personalabteilung klärt). `gleittag` blendet die Tagesart ein.
  * `autoIn` = automatisches Einstempeln beim Öffnen der Seite, nur im
    Zeitfenster `from`–`to`, standardmäßig aus.
  * Das Dokument wird immer vollständig geschrieben – neue Felder in
    `settingsDoc()` ergänzen, sonst gehen sie beim Speichern verloren.

Stempeluhr „Jetzt stempeln“: Standard ist die Erinnerung. An einem Arbeitstag
ohne Feiertag, Tagesart und Buchung fragt die Seite nach, und erst der Klick
bucht Kommen. Selbst bucht sie nur, wenn `autoIn.on` eingeschaltet ist.
Gestempelt wird ins Artefakt, nicht in OptiTime; für die Abrechnung maßgeblich
bleibt OptiTime. Die Seite wirkt nur, solange sie geöffnet ist.

Feiertage Brandenburg werden im Artefakt berechnet (Ostern nach Gauß) und nur
nach Klick auf „übernehmen“ als `type: "feiertag"` gespeichert.

Der im HTML eingebettete Stand vom 14.09.2026 ist nur Notfall-Anzeige und
Erstbefüllung. Neue Buchungen kommen über „Buchungen importieren“
(`Datum;Von;Bis;Art`) in die Seite – dafür ist keine Änderung am Code nötig.
Zeilen ohne Uhrzeit sind Tagesarten (`2026-12-28;;;Urlaub`), erkannt per
Stichwort: halb+urlaub, sonder/000004, urlaub, krank, feiertag, gleit.

## Neue Funktionen: Planungs-Skills vorschlagen
Wenn David eine neue Funktion planen oder umsetzen lassen will (auch im
Arbeitszeitkonto), vor dem Coden prüfen und aktiv vorschlagen, ob ein
Skill aus „Skills For Real Engineers“ (Matt Pocock) vorgeschaltet werden
sollte:

* `grill-me` – wenn Anforderung, Randfälle oder Fachregeln unklar sind.
* `to-spec` – wenn die Funktion mehrere Teile hat oder Datenmodell bzw.
  Artefakt-Speicher (`db`) berührt.
* `to-tickets` – wenn die Spec in mehrere Arbeitsschritte zerfällt.

Nur vorschlagen, nicht ungefragt ausführen. Ist das Plugin in der Sitzung
nicht aktiv, darauf hinweisen und die Installation anbieten. Bei
Kleinständerungen (Tippfehler, Farbwert, Einzeiler) entfällt der Vorschlag.

## Arbeitsweise bei Entscheidungen
Bei schwer umkehrbaren oder nach außen wirkenden Aktionen (PR mergen, Branch
löschen, E-Mail senden, Veröffentlichen, Daten überschreiben) und bei
mehrdeutigen Anweisungen: **immer zuerst nachfragen** und dabei klar sagen,
welche Option in diesem Fall die beste ist und warum. Erst nach ausdrücklicher
Bestätigung ausführen.

Auswahlmöglichkeiten (Optionen, Varianten, Rückfragen) immer **zum Anklicken**
ausgeben (Multiple-Choice-Abfrage), nicht nur als Text – die empfohlene Option
steht zuerst und ist als „(Empfohlen)“ markiert.

## Sparsamer Umgang mit Nutzungsguthaben
Verbindlich gilt `docs/arbeitsanweisung-sparsamkeit.md` (Rangfolge: Sicherheit
und Datenschutz, diese Anweisung, aufgabenbezogene Anweisungen). Sorgfalt bleibt
unangetastet: Die Regeln dieser Datei zu Rückfragen vor schwer umkehrbaren
Aktionen, Multiple-Choice-Abfragen und Rechtsabteilungs-Hinweisen gelten
weiter.

Ausnahme zur Längengrenze (David, 2026-10-07): Das Standardformat mit fünf
Abschnitten (Zusammenfassung, Empfehlung, Vorlage, Risiken, KPIs) hat Vorrang
vor der 150-Wörter-Grenze. Innerhalb des Formats gilt weiter: keine
Wiederholungen, keine Alternativen ohne Anfrage.
