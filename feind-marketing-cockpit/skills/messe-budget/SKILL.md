---
name: messe-budget
description: Überträgt die Ausgaben rund um die Messe InfraTech 2027 (Standbau, Technik, Logistik, Hotel und Personal, Catering, Werbemittel, Reserve) als Ist-Summen je Kostenblock in das Feind Cockpit (Modul InfraTech 2027 › Budget). Greift bei „Messeausgaben erfassen“, „Ausgabe eintragen“, „Rechnung Messe“, „Angebot Messebauer übernehmen“, „Budget InfraTech aktualisieren“, „Plan vs. Ist Messe“ oder „/cockpit-sync budget“.
---

# Messe-Budget – Ausgaben InfraTech 2027 ins Cockpit

## Zweck

Du hältst die Ist-Ausgaben der InfraTech 2027 (12.–15.01.2027, Rotterdam Ahoy) im Cockpit
aktuell. Das Cockpit rechnet daraus Plan vs. Ist je Kostenblock und die Ampel
(grün im Plan, gelb bis +10 %, rot darüber). Umsatzdaten gehören **nicht** hierher.

Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`
Verbindliches Datenmodell: `kontext/datenmodell.md` (Dokument `budget/actuals`).

## Quellen

* SharePoint „Marketing“: `03_Events/2027_InfraTech_Rotterdam/02_Budget & Angebote/`
  (Angebote, Auftragsbestätigungen, Rechnungen). Stand 29.09.2026: Ordner leer.
* Direkte Angabe von David im Chat, z. B. „Ausgabe: 1.180 € Spedition, Rechnung vom 12.11.“.
* Nichts schätzen oder aus Angeboten hochrechnen. Ein Angebot ist **kein** Ist; es darf
  nur als `forecast` übernommen werden, wenn David das ausdrücklich sagt.

## Kostenblöcke und Schlüssel

| Kostenblock im Cockpit | Schlüssel in `blocks` | Planrahmen 2027 (brutto) |
|---|---|---|
| Messestand / Standbau | `messestand-standbau` | 11.000–13.000 € |
| Technik, Strom, TV, Parken/Müll | `technik-strom-tv-parken-muell` | 2.000–2.400 € |
| Logistik / Spedition | `logistik-spedition` | 1.100–1.400 € |
| Hotel / Aufbaupersonal | `hotel-aufbaupersonal` | 3.700–4.300 € |
| Catering / Geschirr | `catering-geschirr` | 600–750 € |
| Werbemittel / Print | `werbemittel-print` | 3.000–3.500 € |
| Reserve | `reserve` | 2.800–3.200 € |

Unklare Zuordnung (z. B. Reisekosten Anreise, Standgebühr, Katalogeintrag): David fragen,
nicht raten. Standgebühr und Katalog zählen bis zur Klärung zu `messestand-standbau`
bzw. `werbemittel-print` **nur mit Bestätigung**.

## Datensatz `budget/actuals`

```json
{ "blocks": { "logistik-spedition": { "ist": 1180, "forecast": 1250 } }, "updatedAt": 1790000000000 }
```

* Beträge in ganzen Euro brutto, als Zahl. `ist` = Summe aller bezahlten oder fest
  beauftragten Posten des Blocks; `forecast` optional (sonst nimmt das Cockpit die Mitte
  des Planrahmens).
* Das Dokument wird immer **ganz** gesetzt (`set`): vorher lesen, nur den betroffenen
  Block ändern, alle übrigen Blöcke unverändert mitschreiben.
* Die Einzelposten (Datum, Betrag, Block, Beleg-Dateiname) führst du als Tabelle im
  Chat und – nach Freigabe – als Markdown-Datei
  `02_Budget & Angebote/JJJJ-MM-TT_Ausgabenliste-InfraTech_DH_vNN.md`, nicht im Cockpit.

## Arbeitsablauf

1. `ArtifactData get` auf `budget/actuals` – aktuellen Stand lesen.
2. Neue Posten aus Quelle bzw. Chat sammeln und je Kostenblock zuordnen.
3. Übersicht zeigen: Block · bisher Ist · neu · künftig Ist · Abweichung zum Planrahmen.
4. **Erst nach Bestätigung durch David** `ArtifactData set` auf `budget/actuals`
   und `meta/sync.budget = {at, source}` setzen.
5. Überschreitet ein Block +10 %: im Tagesbrief als `warnung` melden (Modul `infratech`).

## Regeln

* Keine personenbezogenen Daten: keine Namen, E-Mail-Adressen, Kontonummern oder
  Rechnungsanschriften von Ansprechpartnern. Lieferanten nur als Firma.
* Budgetzahlen sind intern: nie in Marketing-Texte, Posts oder Mails an Externe übernehmen.
* Verträge, Storno- und Zahlungsbedingungen: „Bitte Rechtsabteilung prüfen.“
* Umsatzdaten sind ausdrücklich ausgeschlossen, bis David das freigibt.
