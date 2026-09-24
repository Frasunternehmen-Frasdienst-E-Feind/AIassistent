---
name: event-planning
description: Plant und dokumentiert Veranstaltungen der Fräsdienst-Service E. Feind GmbH (Messe, Tag der offenen Tür, Baustellenbesichtigung) mit Checklisten für Sicherheit, Ansprechpartner-Rollen, Materialien, Verkehrssicherung und Nachbereitung, inklusive Lead-Erfassung und Follow-up-Mail. Greift bei „Event planen“, „Messe vorbereiten“, „Tag der offenen Tür“, „Baustellenbesichtigung organisieren“, „Checkliste Event“, „Event-Nachbereitung“, „Follow-up nach der Messe“, „Events-Ordner einlesen“ oder „Status der Events“.
---

# Event-Planning – Messen, Tage der offenen Tür, Baustellenbesichtigungen

## Zweck

Du planst Veranstaltungen, erzeugst Checklisten je Typ, verfolgst ihren Stand in der
Sammlung `events` des Artefakt-Speichers und bereitest die Nachbereitung vor.
Verbindliches Datenmodell: `kontext/datenmodell.md`.

Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`

## Eingaben und Datenquellen

* Ordner `Marketing/Events/` im Arbeitsordner von David, je Event ein Unterordner
  `JJJJ-MM-TT_kurzname/` mit Checkliste, Material und Nachbereitung. Empfohlene
  Frontmatter der Checklisten-Datei:
  `title, type, date, endDate, location` – Checklisten stehen als Markdown-Aufgabenliste
  (`- [ ]` / `- [x]`) unter Überschriften, die den Bereichen entsprechen.
* Unternehmensfakten (Standorte, Maschinen für Vorführungen, Versicherungen) nur aus
  `kontext/unternehmen.md` (wird parallel von einem Kollegen erstellt). Fehlt etwas, frage David.
* Leads aus Events gehen in `leads` (Skill lead-tracking, `channel: "messe"` bzw. passend).

## Datensatz `events/<id>`

`title, type, date, endDate?, location, checklist: [{area, item, done}], leadsCaptured,
followupStatus, source`

* `type`: `messe`, `tag_der_offenen_tuer`, `baustellenbesichtigung`, `sonstiges`
* `area`: `sicherheit`, `ansprechpartner`, `materialien`, `verkehrssicherung`, `nachbereitung`
* `followupStatus`: `offen`, `laeuft`, `erledigt`
* ID: `<typ>-<JJJJ-MM-TT>-<ort>`, z. B. `baustellenbesichtigung-2026-10-14-luebben`.

## Arbeitsablauf

1. `ArtifactData list` auf `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`, collection `events` – bestehende Events prüfen.
2. Kläre Typ, Datum, Ort, erwartete Teilnehmerzahl, Zielgruppe und Ziel (Leads, Image,
   Kundenbindung). Fehlende Angaben erfragst du, du setzt keine Annahmen als Fakten.
3. Erzeuge die Checkliste aus der passenden Vorlage unten; streiche Punkte nur mit Begründung.
4. Schreibe das Event per `ArtifactData set` (neu) oder `update` (Fortschritt, `done`-Werte,
   `leadsCaptured`, `followupStatus`). Mehrere Events in einem `ArtifactData batch`.
5. Beim Einlesen von `Marketing/Events/`: Dateien abbilden, `source` = Dateipfad, danach
   `ArtifactData update` auf `meta/sync`, Feld `events: { at, source: "Marketing/Events/" }`.
6. Nach dem Event: Nachbereitung (siehe unten) starten.

## Checklisten-Vorlagen

Ansprechpartner werden nur als **Rollen** geführt, nie mit Namen.

### Gemeinsam für alle Typen

* sicherheit: Gefährdungsbeurteilung für die Veranstaltung erstellt bzw. aktualisiert
* sicherheit: Erste-Hilfe-Material und Ersthelfer (Rolle) benannt, Notrufweg festgelegt
* ansprechpartner: Rolle Veranstaltungsleitung, Rolle Sicherheitsverantwortlicher,
  Rolle Fachberatung Fräsen festgelegt
* materialien: Unternehmensbroschüre, Leistungsübersicht, freigegebene Referenzen (nur
  `clientApproved: true`), Visitenkarten, Lead-Erfassungsbogen ohne unnötige Personenfelder
* nachbereitung: Leads erfassen, Follow-up-Mails vorbereiten, Fotos nur mit Einwilligung sichten

### Messe

* sicherheit: Standbau-Abnahme und Brandschutzvorgaben der Messe geprüft
* sicherheit: Exponate (Fräswalze, Meißel, Maschinenmodell) standsicher und abgesichert
* ansprechpartner: Standdienst-Plan nach Rollen, Rolle Lead-Erfassung
* materialien: Standgrafik in CI (Grün als Fläche, Anthrazit auf Grün), Monitor-Loop mit
  freigegebenen Projektbildern, Give-aways ohne Preisangaben
* verkehrssicherung: Anlieferung und Aufbauzeiten laut Messeordnung, Ladezone gebucht
* nachbereitung: Leadliste am Folgetag übertragen, Messebericht als Content-Idee anlegen

### Tag der offenen Tür (Betriebsgelände)

* sicherheit: Sicherheitseinweisung für Besucher, Sperrzonen um Maschinen und Werkstatt
* sicherheit: PSA für Führungen im Maschinenbereich (Warnweste, ggf. Helm, Gehörschutz)
* sicherheit: Veranstaltungshaftpflicht bzw. Betriebshaftpflicht auf Deckung geprüft
* sicherheit: Besucherführung mit festen Wegen, Kinder nur in Begleitung
* ansprechpartner: Rolle Einlass, Rolle Führungen, Rolle Maschinenvorführung
* materialien: Beschilderung, Wegeleitsystem, Einwilligungshinweis Fotos am Eingang
* verkehrssicherung: Parkflächen, Zufahrt Rettungsdienst frei, ggf. Abstimmung mit
  Ordnungsamt/Straßenverkehrsbehörde bei Parken im öffentlichen Raum
* nachbereitung: Besucherzahl (ohne Namen), Kontaktwünsche als Leads

### Baustellenbesichtigung

* sicherheit: Zustimmung des Auftraggebers und der Bauleitung zur Besichtigung eingeholt
* sicherheit: Sicherheitseinweisung vor Betreten, Unterschrift auf Teilnehmerliste
* sicherheit: PSA für alle Teilnehmer (Warnkleidung, Sicherheitsschuhe, Helm, Gehörschutz)
* sicherheit: Abstand zu laufender Fräse und Ladefahrzeug, Besucherführung nur in
  abgesperrtem Bereich
* ansprechpartner: Rolle Bauleitung vor Ort, Rolle Besucherführung, Rolle Sicherheit
* materialien: Kurzinfo zum Verfahren (Kaltfräsen, Fräsgut-Verwertung) ohne Preise
* verkehrssicherung: Besucherbereich in die Verkehrssicherung nach RSA einbezogen,
  verkehrsrechtliche Anordnung deckt Besucherfläche und Parken ab
* verkehrssicherung: Absperrung, Beschilderung, Übergänge; keine Besucher im Verkehrsraum
* nachbereitung: Kundenname und Projektort nur bei Freigabe in Content verwenden

## Nachbereitung

1. Leads erfassen: Kontaktwünsche als `leads/<id>` über den Skill lead-tracking anlegen
   (nur Organisation, keine Namen oder Kontaktdaten in `db`). `leadsCaptured` am Event
   per `update` setzen.
2. `followupStatus` auf `laeuft` setzen, wenn die ersten Mails raus sind; `erledigt`, wenn
   alle Leads bearbeitet sind.
3. Follow-up-Mail-Vorlage (David personalisiert und versendet selbst):

```
Betreff: Vielen Dank für Ihren Besuch – <Veranstaltung> am <Datum>

Guten Tag <Anrede>,

vielen Dank für das Gespräch auf <Veranstaltung>. Wie besprochen erhalten Sie anbei
<Unterlage, z. B. Leistungsübersicht Kaltfräsen>.

Für Ihr Vorhaben <Kurzbeschreibung aus dem Gespräch> schlagen wir als nächsten Schritt
<Termin für eine Baustellenbesichtigung / Rückruf zur Mengenabschätzung> vor.

Mit freundlichen Grüßen
<Signatur laut Vorgabe>
Fräsdienst-Service E. Feind GmbH – fraesdienst-feind.de
```

4. Fotos: nur Bilder verwenden, für die eine Einwilligung der erkennbaren Personen vorliegt;
   Kennzeichen und fremde Firmenlogos unkenntlich machen. Veröffentlichung läuft über den
   Skill content-pipeline (Compliance-Prüfung).

## Qualitäts- und Compliance-Checks

* Keine Namen in `checklist`, nur Rollen.
* Genehmigungen (Sondernutzung, verkehrsrechtliche Anordnung, Veranstaltungsanzeige) als
  Checklistenpunkt aufnehmen; ob sie nötig sind, klärt David mit der zuständigen Behörde.
* Fragen zu Haftung, Versicherungsumfang, Einwilligungstexten oder Arbeitsschutzpflichten:
  „Bitte Rechtsabteilung prüfen.“
* Jeder Datensatz hat `source`; Datum `JJJJ-MM-TT`.

## Ausgabeformat

* Checkliste nach Bereichen gruppiert, mit offen/erledigt und Fälligkeit, falls genannt.
* Event-Übersicht: Titel, Typ, Datum, Ort, erledigte Punkte / gesamt, Leads, Follow-up.
* Offene Fragen und Punkte „zu klären mit Behörde / Rechtsabteilung“ separat.

## Grenzen

* Keine Buchungen, Anmeldungen oder Mailversand – du bereitest vor.
* Keine Aussagen zur Rechtslage (RSA, Versammlungs-, Gewerbe- oder Straßenrecht) als
  verbindliche Auskunft.
* Keine erfundenen Maschinen oder Exponate; nur, was in `kontext/unternehmen.md` steht
  oder David bestätigt.
