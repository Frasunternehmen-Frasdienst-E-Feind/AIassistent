# Kurz-Spec: Themenprojekte aus gehäuften Einträgen (Wissensarchiv)

Stand 09.10.2026 · Wunsch David (Kommentar im Cockpit): „Neue Projekte eigenständig anlegen, wenn bei der
automatisierten Zuordnung auffällt, dass ein Thema mehrfach bzw. gehäuft auftritt, z. B. Messeplanung Rotterdam 2027.“
Entscheidungen 09.10.: umsetzen im führenden Cockpit (TfuzbG); Vorschlag ab 3 Einträgen, Anlage mit einem Klick.

## Ziel
Bisher entstehen Projekte nur für Bauprojekte mit Ort (Kategorie „Projekt & Referenz“). Einträge zu einem
wiederkehrenden Thema ohne Ort, etwa Messeplanung, Kampagnen oder Ausschreibungsserien, bleiben ohne Projekt.
Das Cockpit erkennt solche Häufungen jetzt und schlägt ein Themenprojekt vor.

## Datenmodell (`kb_projects/<id>`)
- Bestehende Felder bleiben unverändert.
- Neu: `kind: "thema"`. Bauprojekte haben `kind` nicht gesetzt oder `"bau"`.
- Themenprojekte haben keinen Ort (`lat`/`lon` = null) und erscheinen nicht auf der Projektkarte.
- Weitere Felder bei der Anlage:
  - `status: "entwurf"`, `auto: false`, `createdFrom: "themenvorschlag"`
  - `items`: Kennungen der zugeordneten Einträge
  - `topicKey`: gefaltete Schreibweise des Themas
- Einträge (`kb_items/<id>`) bekommen `projectId` des Themenprojekts. Neu im Ergebnis der Einordnung:
  `fileTopic`; das Feld lieferte die KI schon, es wurde bisher nicht gespeichert.

## Erkennung (reine Funktion `FC.kb.topicSuggestions`)
1. Berücksichtigt werden nur Einträge ohne `projectId`, die nicht archiviert sind.
2. Themen je Eintrag:
   - erkannte Projektnamen (`entities.projects`)
   - mehrteilige Schlagwörter (`tags`, ab zwei Wörtern)
   - `fileTopic`
   - Vergleich in gefalteter Schreibweise: klein, ohne Umlaute und Satzzeichen.
3. Ein Thema mit mindestens 3 Einträgen wird zum Vorschlag.
4. Kein Vorschlag, wenn es schon ein Projekt mit gleichem gefaltetem Namen gibt oder das Thema ausgeblendet wurde.
5. Überschneidungen: Größere Vorschläge gehen vor, jeder Eintrag zählt nur in einem Vorschlag.
6. Als Name gilt die häufigste Original-Schreibweise.

## Zuordnung neuer Einträge (`FC.kb.matchTheme`)
- Passt ein Thema eines neu eingeordneten Eintrags zu einem bestehenden Themenprojekt, ordnet die Einordnung
  den Eintrag automatisch dort zu.
- Bauprojekte haben Vorrang: Für sie gilt weiter die bisherige Ortslogik.

## Oberfläche
- Wissen › Eingang und Wissen › Archiv: Karte „Themenvorschläge“, sobald Vorschläge vorliegen. Je Vorschlag:
  - Name, Anzahl, die ersten Titel
  - Knopf „Als Projekt anlegen“
  - Knopf „Nicht vorschlagen“
- „Nicht vorschlagen“ merkt sich das Thema in diesem Browser (`localStorage`). Das betrifft nur die Anzeige; Daten
  werden nicht verändert.
- Ohne Schreibrecht ist der Knopf zum Anlegen gesperrt.

## Nicht Teil dieser Änderung
- Automatisches Anlegen ohne Rückfrage
- Zusammenführen bestehender Projekte

## Tests
- Unit-Tests in `test/kb-themen.test.mjs`:
  - Schwelle 3
  - Faltung der Schreibweise
  - bestehendes Projekt
  - ausgeblendetes Thema
  - Überschneidung
  - archivierte und bereits zugeordnete Einträge
- Browser-Test `e2e/themenprojekte.e2e.mjs`: Vorschlag erscheint, Anlage ordnet alle Einträge zu, Vorschlag
  verschwindet, „Nicht vorschlagen“ blendet aus.
