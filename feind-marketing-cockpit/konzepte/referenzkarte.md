# Spec: Referenzkarte in der Referenz-Bibliothek

Stand 03.10.2026. Auftrag: Kommentar-Thread 6c0601e1 (Referenz-Bibliothek), Entscheidung David
„Karte neu im Cockpit bauen“.

## Ziel

Die Referenzprojekte erscheinen in der Referenz-Bibliothek auf einer Deutschlandkarte. Wird ein Punkt
mit der Maus überfahren, angetippt oder per Tastatur fokussiert, erscheint eine Bubble im vorhandenen
Brennglas-Tooltip-Stil. Sie zeigt:

- eine kurze Überschrift
- eine Erklärung in einem Satz
- das Datum
- den Link „Mehr zum Projekt“

## Umfang

1. **Karte**
   - Eigene SVG-Umrisskarte Deutschland, eingebettet, ohne externe Kacheln. So läuft sie offline, ist druckfähig und hält das CI ein.
   - Die Projektion ist eine einfache Plattkarte auf den Bereich 47,2–55,1° N und 5,8–15,1° O. Die Genauigkeit reicht für Projektpunkte.
   - Die Standorte Lübben und Wittenburg erscheinen als Fräszahn-Marken.
2. **Punkte**
   - Je Referenz mit `lat`/`lng` erscheint ein Punkt.
   - Streckenprojekte (`geo.kind: "strecke"`) sind als Linie zwischen zwei Punkten möglich.
   - Fehlen Koordinaten, steht das Projekt in der Liste unter der Karte („ohne Ort“) und nicht auf der Karte.
3. **Bubble**
   - Wiederverwendung von `app-tooltip.js` (`data-tip`) für den Text.
   - Für den Link gibt es eine angeheftete Variante mit Knopf.
   - Der Kundenname erscheint nur, wenn `clientApproved: true`.
4. **Filter**
   - Die Filter der Bibliothek (Region, Leistung, Jahr, Suche) wirken auch auf die Karte.
5. **Druck und PDF**
   - Die Karte kommt in die Druckfassung.
   - Die Referenzmappe (PDF) bekommt die Spalte „Ort“.

## Datenmodell `references/<id>` (Ergänzung)

| Feld | Typ | Bedeutung |
|---|---|---|
| `place` | string | Ortsangabe für die Anzeige, z. B. „Bitburg“ |
| `lat`, `lng` | number | WGS84, auf 3 Nachkommastellen gerundet |
| `geo` | object? | `{ kind: "punkt" \| "strecke", to: { lat, lng } }`, optional |
| `date` | string | `JJJJ-MM` oder `JJJJ-MM-TT`, Ausführungszeitraum (Ende) |
| `projectUrl` | string? | nur `https://`, Ziel des Links „Mehr zum Projekt“ |

Regeln:

- Koordinaten und Datum nur aus Quellen (Projektakte, Website, Freigabe). Die Quelle steht im Feld `source`.
- Ortskoordinaten einer Gemeinde gelten als „ungefähr“.
- Nichts wird geraten. Fehlende Angaben bleiben leer.

## Offene Punkte (Bestand 03.10.2026)

Allen vier Referenzen fehlen Datum und Projektlink. Ortsangaben hat nur ein Teil:

| Referenz | Ort laut Bestand | Fehlt |
|---|---|---|
| Autobahnsanierung A3 / A7 | – | Abschnitt, Datum, Link |
| BAB 7 – Fahrbahnsanierung | – | Abschnitt, Datum, Link |
| Flugplatz Bitburg | Rheinland-Pfalz | Datum, Link |
| Industrieboden REWE Nossen | Sachsen | Datum, Link |

## Abnahme

- Smoke-Test in allen Zeilen OK, geprüft auf Desktop, Tablet und Handy, jeweils hell und dunkel.
- Bubble per Maus, Touch und Tastatur erreichbar; Esc schließt sie.
- Ohne Koordinaten bleibt die Karte leer, mit dem Hinweis, welche Angaben fehlen.
- `kontext/datenmodell.md` und Skill `reference-library` sind um die neuen Felder ergänzt.
