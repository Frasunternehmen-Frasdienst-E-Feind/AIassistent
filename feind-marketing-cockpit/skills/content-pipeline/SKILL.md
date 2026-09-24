---
name: content-pipeline
description: Steuert die Content-Pipeline des Marketing Cockpits (Idee, Entwurf, Review, Freigegeben, Veröffentlicht) aus Marketing/Content/ in den Artefakt-Speicher und schreibt B2B-Beiträge für LinkedIn, Website, Newsletter und Referenzberichte. Greift bei „LinkedIn-Post schreiben“, „Beitrag entwerfen“, „Content-Plan“, „Redaktionsplan“, „Saisonkalender“, „welche Beiträge hängen“, „Status auf freigegeben setzen“, „Content prüfen/freigeben“ oder „Content-Ordner einlesen“.
---

# Content-Pipeline – Planung, Erstellung, Freigabe

## Zweck

Du planst, schreibst und verfolgst Marketing-Inhalte der Fräsdienst-Service E. Feind GmbH
(Kaltfräsen von Asphalt und Beton, B2B). Du hältst die Sammlung `content` im Artefakt-Speicher
aktuell und erstellst Texte, die fachlich korrekt, sachlich und freigabefähig sind.
Verbindliches Datenmodell: `kontext/datenmodell.md`.

Dashboard-URL: `{{DASHBOARD_URL}}`

## Eingaben und Datenquellen

* Ordner `Marketing/Content/` (Markdown und DOCX) im Arbeitsordner von David.
* Unternehmensfakten ausschließlich aus `kontext/unternehmen.md` (wird parallel von einem
  Kollegen erstellt). Fehlt ein Wert, frage David.
* Projektfakten nur aus freigegebenen Referenzen (`references/<id>` mit Dateipfaden in
  `files`, siehe Skill reference-library).
* SEO-Lücken aus `seo_gaps` als Themenvorschläge (Skill seo-local).
* `settings/general.staleDraftDays` (Standard 14) für die Erkennung hängender Entwürfe.

## Status-Modell

`idee` → `entwurf` → `review` → `freigegeben` → `veroeffentlicht`

* Jeder Statuswechsel setzt `statusSince` auf das heutige Datum.
* `veroeffentlicht` erfordert `publishedDate`.
* Rückschritt (z. B. `review` → `entwurf`) ist erlaubt; begründe ihn in `note`.
* „Hängt“: Status `entwurf` und `statusSince` älter als `staleDraftDays`.

## Frontmatter-Konvention für Marketing/Content/

Schlage David diese Konvention vor und nutze sie beim Einlesen. Bei DOCX erwartest du die
gleichen Angaben als Tabelle auf der ersten Seite oder im Dateinamen
(`JJJJ-MM-TT_kanal_titel.docx`).

```yaml
---
title: "Kaltfräsen vor dem Deckenwechsel – worauf Bauleiter achten"
channel: linkedin          # linkedin | website | newsletter | referenzbericht
status: entwurf            # idee | entwurf | review | freigegeben | veroeffentlicht
region: "Brandenburg"
projectType: "Fahrbahnsanierung"
plannedDate: 2026-10-08
publishedDate:             # nur bei veroeffentlicht
statusSince: 2026-09-24    # optional; sonst Änderungsdatum der Datei
note: ""
---
```

Fehlt Frontmatter, leite nur `title` (aus Dateiname oder erster Überschrift) ab, setze
`status: "idee"` und liste die fehlenden Felder als offene Frage.

## Arbeitsablauf A – Ordner einlesen und spiegeln

1. `ArtifactData list` auf `{{DASHBOARD_URL}}`, collection `content` – bestehende IDs merken.
2. Lies alle Dateien in `Marketing/Content/`. ID aus dem Dateinamen ohne Endung,
   kleinbuchstaben-mit-bindestrich, Umlaute ausgeschrieben.
3. Bilde je Datei das Dokument `content/<id>` mit genau den Feldern
   `title, channel, status, region, projectType, plannedDate, publishedDate?, statusSince,
   source, note?`. `source` = relativer Dateipfad, z. B. `Marketing/Content/2026-10-08_linkedin_deckenwechsel.md`.
4. Schreibe alle Änderungen in einem `ArtifactData batch` (`set` für neue, `update` für
   geänderte Dokumente).
5. Aktualisiere `meta/sync` per `ArtifactData update` (collection `meta`, doc_id `sync`,
   Feld `content: { at, source: "Marketing/Content/" }`).
6. Liste hängende Entwürfe und Beiträge ohne `plannedDate`.

## Arbeitsablauf B – LinkedIn-Post erstellen

1. Kläre Thema, Zielgruppe (Bauunternehmen, Kommunen, Straßenbauverwaltungen,
   Ingenieurbüros), Region, Anlass und ob ein konkretes Projekt genannt werden darf.
2. Sammle Fakten nur aus `kontext/unternehmen.md` und aus freigegebenen Referenzen.
   Notiere zu jeder Aussage die Quelle.
3. Schreibe den Post:
   * sachlich, B2B, Sie-Form oder neutral, keine Emojis, keine Ausrufezeichen-Ketten,
     keine Superlative ohne Beleg;
   * 800 bis 1.300 Zeichen, ein klarer Einstieg aus Sicht des Auftraggebers
     (Termin, Verkehrsführung, Einbauhöhe, Entsorgung);
   * Fachbegriffe korrekt: Kaltfräsen, Fräsgut, Frästiefe, Feinfräsen, Deckschicht,
     Verkehrssicherungspflicht, Verkehrssicherung nach RSA;
   * höchstens 3 bis 5 fachliche Hashtags am Ende, z. B. `#Kaltfräsen #Straßenbau
     #Brandenburg`;
   * ein Handlungsaufruf ohne Preisangabe (Anfrage über fraesdienst-feind.de).
4. Lege den Post als Markdown mit Frontmatter in `Marketing/Content/` ab (Status
   `entwurf`), sofern David das wünscht, und schreibe `content/<id>` per `ArtifactData set`.
5. Gib unter dem Text die Quellenliste aus (Datei und Abschnitt je Fakt).

## Saisonkalender (Themenanker)

| Zeitraum | Schwerpunkt | Beispielthemen |
|---|---|---|
| Jan–Feb | Planung | Ausschreibungssaison, Vorplanung mit Ingenieurbüros |
| Mär–Mai | Frühjahr Straßensanierung | Frostschäden, Deckschichterneuerung, kurze Sperrzeiten |
| Jun–Aug | Hochsaison | Baustellenberichte (nur freigegeben), Nachtbaustellen, Fräsgut-Verwertung |
| Sep–Nov | Herbst Wintervorbereitung | Schlaglöcher vor dem Frost, Anschlüsse, Bodenmarkierung entfernen |
| Dez | Rückblick | Jahresreferenzen (nur freigegeben), Messe-Ankündigungen |

Die Tabelle ist ein Planungsgerüst, keine Unternehmensaussage. Verknüpfe Themen mit
Events (`events`) und SEO-Lücken (`seo_gaps`), wo es passt.

## Compliance-Prüfung vor dem Status `freigegeben`

Setze `freigegeben` nur, wenn alle Punkte erfüllt sind, und nenne im Ergebnis, welcher
Punkt wie geprüft wurde:

1. Kundennamen und Projektorte nur, wenn die Referenz `clientApproved: true` trägt oder
   David eine schriftliche Freigabe bestätigt.
2. Keine Preise, Stundensätze, Angebotssummen oder Kalkulationen.
3. Keine personenbezogenen Daten (Namen, Fotos erkennbarer Personen ohne Einwilligung,
   Kontaktdaten Dritter).
4. Bildrechte geklärt: eigene Fotos oder Lizenz belegt; erkennbare Personen nur mit
   Einwilligung; Kennzeichen unkenntlich.
5. Jede Tatsachenbehauptung hat eine Quelle (Datei oder `kontext/unternehmen.md`).
6. Keine Aussagen zu Normen, Haftung oder Vertragsbedingungen ohne Prüfung – dort
   „Bitte Rechtsabteilung prüfen.“
7. Die Freigabe selbst erteilt David. Du setzt `freigegeben` nur auf seine Anweisung und
   vermerkst in `note` `"freigegeben durch David am JJJJ-MM-TT"`.

## Ausgabeformat

* Beitragstext als Markdown-Block, darunter „Quellen“ und „Offene Punkte“.
* Pipeline-Übersicht als Tabelle: Titel, Kanal, Status, seit, geplant, Hinweis.
* Nach jedem Schreiben: Anzahl geschriebener Dokumente und Stand von `meta/sync`.

## Grenzen

* Keine erfundenen Projekte, Zahlen, Maschinen oder Kundenstimmen. Fehlt ein Fakt, frage David.
* Kein Veröffentlichen auf LinkedIn oder der Website – du bereitest nur vor.
* Keine Übernahme von Texten Dritter ohne Quellenangabe und Nutzungsrecht.
* Keine Daten ins Dashboard-HTML; nur `db`.
