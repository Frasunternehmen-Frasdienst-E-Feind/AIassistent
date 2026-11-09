# Spec: Wissens-Upload (Ausbau „Wissen › Eingang“)

Stand 06.10.2026. Auftrag: Kommentar-Thread acff8995 (Reiter „Wissens-Upload“). Entscheidungen David vom 06.10.2026:
- Eingang ausbauen und umbenennen, kein neuer Reiter.
- Hintergrund-Agent als stündliche Routine.
- Texterkennung für Scans im Browser.
- Parallele Sitzung legt ihren Stand zuerst ins Repo.

## Ausgangslage (Bestand v32)

Der Eingang kann bereits:
- Ablegen per Ziehen und Strg+V im ganzen Cockpit, Dateiauswahl auch auf dem Handy (Kamera und Fotos).
- Bis zu 200 Dateien je Vorgang, höchstens 20 MB je Datei.
- Eine Warteschlange `kb_items` mit den Stufen `neu → in_arbeit → fertig | pruefen | fehler`, drei Versuchen und 10 Minuten Pause, wenn die KI-Grenze erreicht ist.
- Text aus PDF (pdf.js) sowie aus Word, Excel und PowerPoint (JSZip) lesen.
- Einordnung per KI, ohne KI über Regeln.
- Personenbezogene Daten erkennen und schwärzen, Duplikate über `sha256` finden.
- Verwandte Einträge (`related`), Projektkarte (`kb_projects`) und den Reiter „Prüfung“.

## Grenzen des Artefakts (verbindlich)

- Code läuft nur, solange eine Seite geöffnet ist. Einen dauerhaften Prozess gibt es nicht. Ausgleich: eine Routine (siehe M2).
- Gespeichert wird dauerhaft in `db` und im Dateispeicher. Der Dateispeicher nimmt höchstens 15 MB je Datei, größere Originale gehören nach SharePoint (der Hinweis steht bereits in `review`).
- Es gibt keine Embedding-Schnittstelle. Die Suche bleibt eine Volltextsuche im Browser (Index aus `kb_text`), der „Wissensgraph“ entsteht aus `related` und `entities`.
- Widerspruchsprüfung nur innerhalb eines Projekts oder einer Kategorie, nicht alle Dokumente gegeneinander.

## Meilensteine

### M1 – Eingang wird „Wissens-Upload“ (1 Sitzung)
1. Reiter umbenennen: `['eingang', 'Wissens-Upload']`. Die Kennung `eingang` bleibt, damit Links und Aktionen weiter funktionieren.
2. **Ersetzen mit Versionsstand:** Detaildialog → „Neue Fassung hochladen“. Der bisherige Stand wandert nach `versions[]`, danach wird neu eingeordnet.
3. **Sauberes Löschen:** `kb_items/<id>`, `kb_text/<id>` und das Asset zusammen löschen. Rückverweise in `related` anderer Einträge entfernen. Ein Protokolleintrag wird angelegt.
4. **Texterkennung (OCR):** Tesseract.js (cdnjs/jsdelivr) mit Sprachdaten Deutsch und Englisch. Sie wird nur geladen, wenn ein PDF ohne Textschicht oder ein Bild vorliegt. Höchstens 20 Seiten je Datei, danach der Hinweis „Rest nicht gelesen“. `extract: "ocr"`.
5. **Fortschritt je Eintrag:** Die Stufe (Lesen, OCR Seite x/y, Einordnen, Verknüpfen) steht sichtbar auf der Karte. Das gibt es teilweise schon über `setStep`.

### M2 – Hintergrund-Agent als Routine (0,5 Sitzung, Freigabe David)
- Eine Claude-Code-Routine läuft stündlich (werktags 7–19 Uhr). Ablauf:
  1. `ArtifactData query kb_items status=neu`
  2. Volltext aus `kb_text` lesen (Originale bleiben im Browser)
  3. Einordnen nach derselben Taxonomie (`FC.kb`)
  4. per `batch` zurückschreiben, `processedBy: "routine"`
- Sperre über `lock: {by: "routine", at}`, damit Seite und Routine denselben Eintrag nicht gleichzeitig bearbeiten.
- Was die Routine nicht lesen kann (Binärdatei ohne Text), bleibt `neu`, mit dem Hinweis „beim nächsten Öffnen der Seite“.
- Überwachung: `meta/sync.kb = {at, done, failed}`. Diesen Wert zeigt der Status im Admin-Bereich.

### Geprüfter Ablauf (Prototyp vom 06.10.2026)
Der Prototyp liegt auf dem Branch `prototyp/wissens-upload-ablauf` (`konzepte/PROTOTYP-wissens-upload-ablauf.html`, 7 Szenarien). Er ist nicht für `main` gedacht. Bestätigte Regeln:
- **Sperre** `lock: {by, at, rev}` gilt 10 Minuten. Eine fremde, frische Sperre weist ab, eine abgelaufene darf übernommen werden.
- **Fassungsnummer** `rev` steigt bei jeder neuen Fassung. Ein Ergebnis mit alter `rev` wird verworfen, und der Eintrag wartet neu.
- **Gelöschte Einträge:** Ein spätes Ergebnis legt sie nie wieder an (Prüfung `byId` vor dem Schreiben).
- **Versuche:** Nur echte Fehler zählen. Eine abgebrochene Bearbeitung (Seite geschlossen, Sperre abgelaufen) und die KI-Grenze zählen nicht. Nach drei echten Fehlern gilt `fehler` (Entscheidung David).
- **Scans ohne Text** liest nur die Seite (OCR). Warten sie länger als 24 h, meldet die Routine das in „Prüfung“ und im Tagesbrief (Entscheidung David).

### M3 – Widersprüche, Lücken, Suche (1 Sitzung)
- **Je Projekt:** Fakten aus allen Einträgen eines Projekts vergleichen (Fläche, Frästiefe, Datum, Ort). Abweichungen kommen in `review` mit Quelle. Lücken (fehlendes Datum, fehlender Ort) als offene Fragen.
- **Volltextsuche** über Titel, Zusammenfassung und `kb_text` (nur für Admins), mit Treffern samt Textausschnitt.
- **Zusammenfassung je Projekt:** To-dos und offene Fragen.

## Datenmodell (Ergänzung `kontext/datenmodell.md`)

| Feld | Typ | Bedeutung |
|---|---|---|
| `kb_items.versions` | `[{at, by, name, sha256, size, assetId?}]` | frühere Fassungen, neueste zuerst, höchstens 10 |
| `kb_items.extract` | `"text"\|"pdf"\|"office"\|"ocr"\|"keiner"` | um `ocr` erweitert |
| `kb_items.ocrPages` | number? | gelesene Seiten bei OCR |
| `kb_items.rev` | number | Fassungsnummer, steigt mit jeder neuen Fassung |
| `kb_items.lock` | `{by, at, rev}`? | Sperre der bearbeitenden Stelle, gilt 10 Min. |
| `kb_items.processedBy` | `"ki"\|"regeln"\|"routine"` | um `routine` erweitert |
| `meta/sync.kb` | `{at, done, failed}` | letzter Lauf der Routine |

## Datenschutz

- Die Routine liest nur `kb_items` und `kb_text` dieses Cockpits und schreibt keine Inhalte nach außen.
- OCR läuft im Browser. Es gehen keine Bilder an externe Dienste.
- Beim Löschen wird alles entfernt (Eintrag, Text, Datei). Aufbewahrungsfristen und Löschkonzept: **Bitte Rechtsabteilung prüfen.**

## Abnahme

- Smoke-Test: alle Zeilen OK.
- Testdaten: ein gescanntes PDF liefert Text (OCR), eine ersetzte Datei zeigt zwei Fassungen, ein gelöschter Eintrag hinterlässt keinen Volltext und kein Asset.
- Routine: Bei geschlossener Seite wird ein neuer Eintrag innerhalb von 1 h eingeordnet, ohne doppelte Bearbeitung.
- Kennzahlen: mindestens 90 % der Einträge sind nach 24 h eingeordnet, kein Eintrag bleibt länger als 1 h in `fehler` ohne Hinweis.
