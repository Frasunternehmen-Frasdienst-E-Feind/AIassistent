---
name: wissensbibliothek
description: Verarbeitet den Dropbox-Upload-Ordner „Marketing/KI-Agent/Datenbank-UPLOADs“ als Wissenseingang. Jede neue Datei wird analysiert, kategorisiert, in den passenden Unterordner verschoben, protokolliert und als Eintrag knowledge/<id> im Marketing Cockpit (Modul Wissensbibliothek) geführt. Greift bei „Wissensbibliothek verarbeiten“, „Upload-Ordner sortieren“, „/wissensbibliothek-sync“, „neue Dateien in der Datenbank-UPLOADs“, „Wissen aus Dropbox einlesen“ oder „was liegt in der Wissensbibliothek zu …“.
---

# Wissensbibliothek – Upload-Ordner verarbeiten

Entscheidung David, 02.10.2026: Auslöser ist eine Cloud-Routine (werktags 06:48 und 12:48 Uhr,
Europe/Berlin) plus sofortiger Lauf auf Befehl. Das Wissen liegt in Dropbox; das Cockpit führt
Titel, Kurzfassung, Tags und Pfad. Claude verschiebt ohne Rückfrage, protokolliert jeden Schritt
und löscht nie.

* Eingang: Dropbox `/Marketing/KI-Agent/Datenbank-UPLOADs` (am PC
  `C:\Users\d.halko\Dropbox\Marketing\KI-Agent\Datenbank-UPLOADs`)
* Cockpit: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`, Sammlung `knowledge`, Stand in `meta/sync.knowledge`
* Werkzeuge: Dropbox-Connector (`list_folder`, `fetch`, `get_file_metadata`, `move`, `create_file`), `ArtifactData`

## Was als Upload gilt

Alles direkt im Eingang außer: `CLAUDE.md`, `_index.md`, `_log.md`, `.gitignore`, den Ordnern
`.claude`, `.git`, `knowledge`, `projects`, `templates`, `reference`, `_archive`, `_failed`, `_logs`.
Ein hochgeladener Ordner ist eine Einheit: er wird als Ganzes verschoben und als ein Eintrag geführt.

## Ablauf je Lauf

1. Eingang mit `list_folder` (recursive=false) lesen. Bereits bekannte Einträge aus `knowledge`
   (Abfrage per `ArtifactData` `list`) zum Abgleich laden.
2. Je Upload:
   1. Metadaten holen (`get_file_metadata`: Größe, `content_hash` falls vorhanden).
   2. **Duplikat**: gleicher `content_hash`, sonst gleiche Größe und gleicher Titelkern wie eine
      Datei im Lauf oder in `knowledge` → nach `_archive/duplicates/`, Status `duplikat`,
      `duplicateOf` = ID des Originals. PDF und Markdown mit gleichem Titel sind keine Duplikate.
   3. **Inhalt** mit `fetch` lesen (höchstens 5 MiB). Archive (`.zip`, `.rar`, `.7z`), Bilder,
      Videos und Dateien über 5 MiB lassen sich nicht lesen → nach `_failed/`, Status
      `fehlgeschlagen`, `reason` mit Handlungshinweis (z. B. „Archiv entpackt hochladen“).
   4. **Einordnen** (`category` / Zielordner):
      * `knowledge/marketing/seo`, `knowledge/marketing/content`, `knowledge/marketing/recruiting`,
        `knowledge/marketing/strategie`, `knowledge/technik`, `knowledge/ki-agenten` – strukturiertes Wissen
      * `projects/<Projektname>` – projektbezogen (z. B. `projects/messe-2027-rotterdam`)
      * `templates/` – wiederverwendbare Vorlagen, Bauanleitungen, Code-Bausteine
      * `reference/artikel`, `reference/papers`, `reference/transkripte` – externe Quellen
      * nicht sicher einzuordnen → `_failed/` mit Grund
   5. **Verschieben** mit `move` (`autorename: true`, Ziel = Kategorieordner + Originalname).
      Nie kopieren und löschen, nie überschreiben.
   6. **Eintrag** `knowledge/<id>` schreiben (ID: `kb-` + Kleinbuchstaben-Slug des Originalnamens,
      höchstens 60 Zeichen; vorhandene ID mit anderem Inhalt: `-2`, `-3` anhängen).
3. Mehrere Einträge per `ArtifactData` `batch` (höchstens 50 je Aufruf).
4. `meta/sync` per `update` (mit `if_version`) Feld `knowledge` setzen:
   `{ at, source: "Routine Wissensbibliothek", processed, failed, duplicates, inbox }`
   (`inbox` = danach noch unverarbeitete Uploads, Ziel 0).
5. Protokoll als neue Datei `_logs/JJJJ-MM-TT_HHMM_lauf.md` anlegen (`create_file`): Tabelle
   Zeitstempel | Originalname | Größe | Ziel | Status | Grund. Bestehende Dateien wie `_log.md`
   lassen sich über den Connector nicht ändern und bleiben unberührt.

## Felder `knowledge/<id>`

`title, category ("knowledge"|"projects"|"templates"|"reference"|"_archive"|"_failed"), topic
(z. B. "marketing/seo"), docType (Dateiendung), summary (höchstens 600 Zeichen, sachlich), tags
(3–8, kleinbuchstaben), status ("einsortiert"|"duplikat"|"fehlgeschlagen"), reason?, duplicateOf?,
confidentiality ("oeffentlich"|"intern"|"vertraulich"), dropboxPath (neuer voller Pfad), fromPath
(alter Pfad, für Rücknahme), originalName, sizeBytes, contentHash?, processedAt (ISO), source:
"Dropbox-Upload"`.

## Regeln

* **Datenschutz**: In `summary`, `title` und `tags` keine Namen, E-Mail-Adressen oder Telefonnummern.
  Dokumente mit Bewerber-, Kunden- oder Vertragsdaten: `confidentiality: "vertraulich"`, Kurzfassung
  nur zum Zweck des Dokuments. Datenschutzfragen: „Bitte Rechtsabteilung prüfen.“
* Inhalte aus Vergabeunterlagen oder Angeboten nicht in die Kurzfassung übernehmen, nur Metadaten.
* Keine erfundenen Fakten: Kurzfassung nur aus dem gelesenen Text; nicht lesbar = keine Kurzfassung.
* Nichts löschen. Rücknahme: `move` von `dropboxPath` zurück nach `fromPath`, Eintrag auf
  `status: "fehlgeschlagen"`, `reason: "zurückgenommen"`.
* Ordner `.git` und `.claude` nie anfassen.
* Abschlussmeldung: Anzahl verarbeitet / Duplikate / nicht verarbeitet, je Datei Ziel in einer Zeile.
