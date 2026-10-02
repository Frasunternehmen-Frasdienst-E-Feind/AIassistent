---
name: wissensbibliothek
description: Wissensbibliothek des Marketing Cockpits aus dem Dropbox-Eingang „Marketing/KI-Agent/Datenbank-UPLOADs“. Greift bei „Eingang verarbeiten“ bzw. „/wissensbibliothek-sync“ (neue Uploads einordnen und verschieben), bei „was liegt in der Wissensbibliothek zu …“ (Bestand durchsuchen) und bei „Einsortierung zurücknehmen“.
---

# Wissensbibliothek

Der **Eingang** ist der Dropbox-Ordner `/Marketing/KI-Agent/Datenbank-UPLOADs` (am PC
`C:\Users\d.halko\Dropbox\Marketing\KI-Agent\Datenbank-UPLOADs`). Das Wissen bleibt in Dropbox;
das Cockpit `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd` führt je Dokument einen Eintrag
`knowledge/<id>` (Felder: `kontext/datenmodell.md`) und den Laufstand in `meta/sync.knowledge`.

Freigabe David, 02.10.2026: Claude verschiebt ohne Rückfrage. Jede Bewegung ist ein `move`
(`autorename: true`) und steht im Laufprotokoll; die Rücknahme ist ein `move` zurück nach `fromPath`.
Löschen und Überschreiben kommen in keinem Schritt vor.

Die `CLAUDE.md` im Eingang beschreibt die frühere lokale Pipeline (SHA-256, Git, `_log.md`
fortschreiben). Über den Dropbox-Connector gibt es weder Hash-Berechnung noch Git noch Anfügen an
Dateien; hier gilt dieser Skill.

## Eingang verarbeiten

Ein **Upload** ist jeder Eintrag direkt im Eingang außer den Systemdateien (`CLAUDE.md`,
`_index.md`, `_log.md`, `.gitignore`) und den Ordnern `.claude`, `.git`, `knowledge`, `projects`,
`templates`, `reference`, `_archive`, `_failed`, `_logs`. Ein hochgeladener Ordner ist eine
**Einheit**: ein Eintrag, als Ganzes verschoben.

1. Eingang lesen (`list_folder`, `recursive: false`) und den Bestand `knowledge` laden.
2. Je Upload eines der drei Ergebnisse herstellen:
   * **Duplikat** – gleicher `content_hash` aus `get_file_metadata`, sonst gleiche Größe und gleicher
     Titelkern wie ein Upload dieses Laufs oder ein Eintrag im Bestand → `_archive/duplicates/`,
     `duplicateOf` gesetzt. Gleicher Titel als PDF und als Markdown sind zwei Fassungen, kein Duplikat.
   * **Nicht lesbar** – `fetch` scheitert oder die Datei ist ein Archiv, Bild, Video oder größer als
     5 MiB → `_failed/`, `reason` sagt, was David tun soll (z. B. „Archiv entpackt hochladen“).
   * **Einsortiert** – aus dem gelesenen Text Zielordner, Titel, Kurzfassung (höchstens 600 Zeichen)
     und 3–8 Tags bestimmen. Zielordner: `knowledge/marketing/{seo,content,recruiting,strategie}`,
     `knowledge/technik`, `knowledge/ki-agenten`, `projects/<projekt-slug>`, `templates`,
     `reference/{artikel,papers,transkripte}`. Kein Ordner passt sicher → wie „nicht lesbar“, mit Grund.
3. Einträge `knowledge/<id>` per `ArtifactData` `batch` schreiben (höchstens 50 je Aufruf); ID
   `kb-` + Slug des Originalnamens, bei Kollision `-2`, `-3`.
4. `meta/sync.knowledge` = `{at, source, processed, failed, duplicates, inbox}` per `update` mit `if_version`.
5. Laufprotokoll als neue Datei `_logs/JJJJ-MM-TT_HHMM_lauf.md`: Zeitstempel | Originalname | Größe | Ziel | Status | Grund.

Fertig, wenn jeder Upload genau einen Eintrag mit dem tatsächlichen `dropboxPath` hat, `inbox`
die verbliebenen Uploads zählt (Ziel 0) und das Protokoll angelegt ist. Abschlussmeldung: Zahlen
je Ergebnis, dann je Datei „Originalname → Ziel (Status)“.

## Bestand durchsuchen

`ArtifactData` `query` auf `knowledge` (Titel, Tags, `topic`), Treffer mit Kurzfassung und
`dropboxPath` nennen; für Details die Datei per `fetch` lesen.

## Einsortierung zurücknehmen

`move` von `dropboxPath` nach `fromPath`, Eintrag auf `status: "fehlgeschlagen"`,
`reason: "zurückgenommen"`, Protokollzeile anlegen.

## Datenschutz und Fakten

Titel, Kurzfassung und Tags beschreiben den Zweck eines Dokuments, nie Personen: Namen,
E-Mail-Adressen und Telefonnummern bleiben im Dokument. Dokumente mit Bewerber-, Kunden- oder
Vertragsdaten tragen `confidentiality: "vertraulich"`; aus Vergabeunterlagen und Angeboten nur
Metadaten. Die Kurzfassung stammt ausschließlich aus dem gelesenen Text. Datenschutz- und
Rechtsfragen: „Bitte Rechtsabteilung prüfen.“

Die geplante Routine „Wissensbibliothek Dropbox“ (werktags 06:48 und 12:48 Uhr) trägt eine
Abschrift dieses Ablaufs, weil ihre Sitzungen das Repository nicht laden. Änderungen hier auch
dort übernehmen (`update_trigger`).
