---
description: Compliance- und Qualitätscheck für einen Text, Post oder eine Datei vor der Freigabe
argument-hint: "<Dateipfad oder eingefügter Text>"
---

Prüfe mit dem Subagenten `feind-copilot` den folgenden Inhalt vor Veröffentlichung:

$ARGUMENTS

Wende die Prüfliste aus dem Abschnitt „Compliance- und Qualitätscheck“ des Copiloten
und den Compliance-Check aus `CLAUDE.md` an. Ausgabe als Tabelle
Prüfpunkt | Ergebnis (erfüllt / nicht erfüllt / nicht prüfbar) | Begründung | Korrekturvorschlag.

Danach:
* Gesamturteil: „freigabefähig“ oder „nicht freigabefähig“ (ein „nicht erfüllt“ bei
  personenbezogenen Daten, Ausschreibungsunterlagen, Preisen oder Kundennamen blockiert).
* Korrigierte Fassung nur als Vorschlag. Nichts veröffentlichen oder versenden.
* Rechtliche Fragen: „Bitte Rechtsabteilung prüfen.“

Ist kein Inhalt angegeben, frage nach Datei oder Text.
