---
name: reference-library
description: Baut die Referenzbibliothek des Marketing Cockpits aus dem Ordner Referenzen/ (PDF, Bilder, Excel) auf, filtert nach Region, Kunde, Leistung und Jahr und erstellt Referenzberichte nur aus belegten Fakten mit Dateipfad. Greift bei „Referenzen einlesen“, „Referenz suchen“, „Referenzprojekte in Brandenburg“, „welche Projekte mit Betonfräsen“, „Referenzbericht schreiben“, „Referenzliste für Ausschreibung“, „Kundenfreigabe Referenz“ oder „Referenz-Ordner synchronisieren“.
---

# Referenzbibliothek – Projekte belegen, filtern, berichten

## Zweck

Du erschließt die Projektreferenzen der Fräsdienst-Service E. Feind GmbH aus dem Ordner
`Referenzen/`, pflegst sie in der Sammlung `references` des Artefakt-Speichers und
schreibst daraus Referenzberichte und Referenzlisten. Jede Aussage muss aus einer Datei
belegt sein. Verbindliches Datenmodell: `kontext/datenmodell.md`.

Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`

## Eingaben und Datenquellen

* Ordner `Referenzen/` im Arbeitsordner von David: PDF (Referenzschreiben, Abnahmen,
  Projektblätter), Bilder (Baustellenfotos), Excel (Projektlisten).
* Unternehmensfakten nur aus `kontext/unternehmen.md` (wird parallel von einem Kollegen
  erstellt).
* Kundenfreigaben: Freigabe durch Vertrieb oder Geschäftsführung (schriftlich belegt, z. B.
  `freigabe.pdf` im Projektordner, oder von David mit Datum weitergegeben).

## Metadaten-Konvention

Schlage David je Projekt einen Unterordner mit einer Metadatei `referenz.md` vor:

```
Referenzen/
  2025_ludwigslust-parchim_b-bundesstrasse-deckschicht/
    referenz.md
    abnahme.pdf
    fotos/IMG_0412.jpg
```

```yaml
---
title: "Deckschichterneuerung Ortsdurchfahrt"
region: "Mecklenburg-Vorpommern"
client: ""                             # nur eintragen, wenn Freigabe vorliegt
clientApproved: false
clientApprovalSource: ""               # z. B. "Referenzen/.../freigabe.pdf" oder "manuell: David 2026-09-24"
services: ["Kaltfräsen Asphalt", "Feinfräsen"]
year: 2025
photoConsent: "keine Personen erkennbar"
---
```

Ordnername laut Plugin-Konvention `JJJJ_region_kurzname` (Kleinbuchstaben, Umlaute als
`ae`, `oe`, `ue`). Umbenennen nur nach Bestätigung durch David. Fehlt `referenz.md`, leite nur ab,
was aus Ordnername und Dateien eindeutig hervorgeht, und liste den Rest als Rückfrage.

## Datensatz `references/<id>`

`title, region, client?, clientApproved, services, year, facts, files, summary, feedback?, source`

* `facts`: Liste von Strings, jeder Fakt mit Dateipfad, z. B.
  `"Frästiefe <Wert> auf <Fläche> (Referenzen/<Ordner>/abnahme.pdf, S. 2)"` (Formatbeispiel, keine Projektangabe).
* `files`: relative Pfade aller belegenden Dateien.
* `client`: nur setzen, wenn `clientApproved: true`; sonst Feld weglassen.
* `feedback`: Kundenzitat nur mit Freigabe und mit Quelle, ohne Personennamen.
* `source`: Projektordner, z. B. `"Referenzen/2025_ludwigslust-parchim_b-bundesstrasse-deckschicht/"`.
* ID: Ordnername in kleinbuchstaben-mit-bindestrich, Umlaute ausgeschrieben.

## Arbeitsablauf A – Einlesen und spiegeln

1. `ArtifactData list` auf `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`, collection `references` – bestehende IDs.
2. Lies je Projektordner `referenz.md` und alle Dateien. PDFs mit Text auslesen (bei
   Scans OCR), Excel-Blätter mit Spaltenköpfen, Bilder nur nach Dateiname, Datum und
   sichtbarem Inhalt beschreiben – keine technischen Werte aus Fotos ableiten.
3. Extrahiere Fakten wörtlich oder eng am Text, jeweils mit Dateipfad und Seite/Blatt.
   Keine Hochrechnungen, keine Umrechnungen ohne Kennzeichnung.
4. Entferne vor dem Schreiben: Personennamen, Unterschriften, Kontaktdaten, Preise,
   Abrechnungssummen, Einheitspreise.
5. Schreibe per `ArtifactData batch` (`set` neu, `update` geändert).
6. `ArtifactData update` auf `meta/sync`, Feld `references: { at, source: "Referenzen/" }`.

## Arbeitsablauf B – Filtern

Nutze `ArtifactData query` auf collection `references` mit den Filtern:

* Region: `region` (Bundesland/Landkreis)
* Kunde: `client` – nur Datensätze mit `clientApproved: true` durchsuchen und anzeigen
* Leistung: `services` enthält den Suchbegriff
* Jahr: `year` (einzeln oder Bereich)

Nicht freigegebene Referenzen erscheinen anonymisiert, z. B. „Kommunaler Auftraggeber,
Landkreis Dahme-Spreewald“.

## Arbeitsablauf C – Referenzbericht

Gerüst (für Website, LinkedIn, Ausschreibungsunterlagen):

```
# <title>
Region / Jahr: <region>, <year>
Auftraggeber: <client nur bei clientApproved, sonst anonymisiert>
Leistungen: <services>

## Ausgangslage
<nur belegte Angaben>

## Ausführung
<Verfahren, Frästiefe, Fläche, Zeitraum – je Satz mit Quelle>

## Ergebnis
<Abnahme, Termintreue – nur wenn belegt>

## Kundenstimme
<nur mit Freigabe>

Quellen: <files>
```

Leere Abschnitte bleiben mit „keine belegten Angaben“ stehen, statt aufgefüllt zu werden.
Den fertigen Bericht übergibst du an den Skill content-pipeline (`channel:
"referenzbericht"`, Status `entwurf`).

## Qualitäts- und Compliance-Checks

* Jeder Fakt hat einen Dateipfad; ohne Beleg kein Fakt.
* Kundenname nur bei `clientApproved: true` mit `clientApprovalSource`.
* Fotos: erkennbare Personen nur mit Einwilligung, Kennzeichen unkenntlich, fremde Logos prüfen.
* Keine Preise, keine personenbezogenen Daten in `db` oder Berichten.
* Vertrauliche Unterlagen (Verträge, Vergabeunterlagen, Nachträge) nicht zitieren; bei
  Unsicherheit zur Nutzbarkeit: „Bitte Rechtsabteilung prüfen.“
* Unternehmensangaben (Maschinen, Mitarbeiterzahl) nur aus `kontext/unternehmen.md`.

## Ausgabeformat

* Trefferliste: | Titel | Region | Jahr | Leistungen | Kunde (freigegeben/anonym) | Dateien |
* Referenzbericht als Markdown nach Gerüst, darunter „Quellen“ und „Offene Fragen“.
* Sync-Ergebnis: neu, geändert, ohne Metadaten, ohne Freigabe.

## Grenzen

* Keine Kundenfreigabe unterstellen; im Zweifel `clientApproved: false`.
* Keine Dateien im Ordner `Referenzen/` verschieben, umbenennen oder löschen.
* Keine Fakten aus dem Gedächtnis, dem Web oder anderen Projekten übertragen.
