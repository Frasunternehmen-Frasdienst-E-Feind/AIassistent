---
name: lead-tracking
description: Pflegt die Lead-Pipeline des Marketing Cockpits (Kanban neu, qualifiziert, Angebot, Verhandlung, gewonnen, verloren) nach Quelle, Region und Landkreis, importiert Leads aus CSV-Export oder CRM-Connector und überwacht Follow-ups. Greift bei „Lead anlegen“, „Leads importieren“, „CRM-Export einlesen“, „welche Leads sind überfällig“, „Follow-up fällig“, „Lead qualifizieren“, „Pipeline-Übersicht“, „Leads nach Region“ oder „Lead auf gewonnen/verloren setzen“.
---

# Lead-Tracking – Pipeline, Qualifizierung, Follow-up

## Zweck

Du führst die Lead-Pipeline der Fräsdienst-Service E. Feind GmbH in der Sammlung `leads`
des Artefakt-Speichers. Du importierst, qualifizierst und erinnerst an Follow-ups. Die
Anzeige übernimmt das Dashboard; du schreibst nur Daten. Verbindliches Datenmodell:
`kontext/datenmodell.md`.

Dashboard-URL: `https://claude.ai/artifact/TfuzbGaWokUSoaqNGRFuRd`

## Datenschutz zuerst

* **Keine Ansprechpartner in `db`**: keine Namen, E-Mail-Adressen, Telefonnummern,
  Durchwahlen. Nur die Organisation (Firma, Kommune, Behörde) in `organisation`.
* Stehen Personendaten in der Quelle, übernimm sie nicht und weise David darauf hin.
* Keine Preise oder Angebotssummen, nur `valueBand` (`"<10k"`, `"10-50k"`, `"50-150k"`, `">150k"`).

## Kanban-Stages und Felder

`neu` → `qualifiziert` → `angebot` → `verhandlung` → `gewonnen` | `verloren`

Pflichtfelder je `leads/<id>`: `organisation, orgType, stage, channel, region, landkreis,
service, createdAt, lastContact, nextAction, nextActionDate, source`, optional `valueBand`.

* `orgType`: `bauunternehmen`, `kommune`, `behoerde`, `ingenieurbuero`, `sonstige`
* `channel` (Quelle des Leads): `website`, `linkedin`, `empfehlung`, `ausschreibung`,
  `messe`, `telefon`
* `region`: Bundesland oder Region aus `settings/general.regions`; `landkreis`: amtlicher
  Landkreisname (z. B. Dahme-Spreewald, Ludwigslust-Parchim) – nur aus der Quelle, nicht raten.
* `service`: Leistung laut `kontext/unternehmen.md` (wird parallel erstellt); ist die
  Leistung dort nicht aufgeführt, frage David.

## Eingaben und Datenquellen

### CSV-Export (vorhandene Konvention)

Das Repository nutzt bereits `data/crm/leads.example.csv` (Trennzeichen `;`, Datum
`TT.MM.JJJJ`) mit den Spalten:

```
created_at;source;status;value
03.08.2026;Website-Formular;gewonnen;4500
```

Diese Spalten liest auch das Tool `seo-report`; ändere sie deshalb nicht, sondern ergänze
für das Cockpit optionale Spalten rechts daneben:
`organisation;org_type;region;landkreis;service;last_contact;next_action;next_action_date`.

Abbildung auf das Datenmodell:

| CSV | `leads/<id>` | Regel |
|---|---|---|
| `created_at` | `createdAt` | `03.08.2026` → `2026-08-03` |
| `source` | `channel` | Website-Formular → `website`, Telefon → `telefon`, Messe → `messe`, Empfehlung → `empfehlung`, LinkedIn → `linkedin`, Ausschreibung → `ausschreibung`; E-Mail und Unbekanntes → nicht raten, David fragen (kein passender Enum-Wert) |
| `status` | `stage` | neu, qualifiziert, angebot, verhandlung, gewonnen, verloren unverändert (kleingeschrieben) |
| `value` | `valueBand` | in Band umrechnen; den Betrag selbst **nicht** speichern; `0` → Feld weglassen |
| Dateipfad | `source` | z. B. `"data/crm/leads_2026-09.csv"` |

Fehlen die Zusatzspalten, lege den Lead trotzdem an, setze fehlende Pflichtfelder auf
`"offen"` (Text) bzw. lasse Datumsfelder leer und liste sie als Rückfrage. `lastContact`
ohne Angabe = `createdAt`. ID: `lead-<createdAt>-<laufende Nr.>` oder aus einer
CRM-ID abgeleitet, damit Re-Importe denselben Datensatz treffen.

### CRM-Connector (Annahme, unbestätigt)

**Annahme:** Ein CRM (z. B. HubSpot) könnte später als Connector angebunden werden. Das ist
nicht bestätigt. Prüfe vor Nutzung, ob ein CRM-Connector in der Sitzung verfügbar ist, und
frage David, welches System gilt. Übernimm aus dem Connector nur Organisationsfelder,
Stage, Quelle, Region und Termine – keine Kontakt-Objekte. `source` = `"connector: <Name>"`.

### Ordner Marketing/Leads/

Lead-Notizen ohne Personendaten; Messe-Listen nur anonymisiert. Findest du dort Namen oder
Kontaktdaten, übernimm sie nicht und empfiehl David die Bereinigung der Datei.

### Manuelle Erfassung

David nennt einen Lead im Chat → frage die Pflichtfelder ab, `source: "manuell: David"`.
Leads aus Ausschreibungen (Skill tender-monitoring) und Messen (Skill event-planning)
bekommen `channel` `ausschreibung` bzw. `messe`.

## Arbeitsablauf

1. `ArtifactData get` auf `settings/general` → `followupDays` (Standard 5), `regions`.
2. `ArtifactData list` auf collection `leads` → bestehende IDs und Stages.
3. Quelle einlesen (CSV, Connector oder Chat) und nach obiger Tabelle abbilden.
4. Datenschutz-Check (siehe unten); abgewiesene Felder protokollieren, nicht speichern.
5. Qualifizieren (siehe Kriterien); Stage nur ändern, wenn David oder die Quelle es belegt.
6. Schreiben in einem `ArtifactData batch`: `set` für neue, `update` für geänderte Leads.
   Stage-Wechsel setzt `lastContact` nicht automatisch – nur bei echtem Kontakt.
7. `ArtifactData update` auf `meta/sync`, Feld `leads: { at, source }`.
8. Follow-up-Liste erzeugen (siehe unten) und David ausgeben.

## Qualifizierungskriterien

Ein Lead wird `qualifiziert`, wenn alle vier Punkte mit „ja“ oder „wahrscheinlich“
beantwortet sind. Schreibe die Begründung in `nextAction` kurz mit, z. B.
`"Qualifiziert: Leistung/Region/Volumen/Termin passen – Angebot vorbereiten"`.

1. **Leistung passt**: Anfrage betrifft eine Leistung aus `kontext/unternehmen.md`
   (z. B. Kaltfräsen von Asphalt oder Beton).
2. **Region**: Einsatzort liegt in `settings/general.regions` oder David bestätigt die Anfahrt.
3. **Volumen**: Umfang lässt ein sinnvolles `valueBand` erwarten; Mindestgrößen nur aus
   `kontext/unternehmen.md` oder von David – nicht schätzen.
4. **Termin**: gewünschter Ausführungszeitraum ist realistisch; Kapazität bestätigt David.

## Follow-up-Regel

* Fällig, wenn `stage` nicht `gewonnen`/`verloren` und `lastContact` älter als
  `followupDays` (Standard 5 Tage).
* Überfällig, wenn zusätzlich `nextActionDate` in der Vergangenheit liegt.
* Schlage je fälligem Lead eine konkrete nächste Aktion vor (Anruf, Nachfassen zum
  Angebot, Terminvorschlag Baustellenbesichtigung) – ohne Namen, adressiert an die Organisation.

## Qualitäts- und Compliance-Checks

* Keine Personendaten in irgendeinem Feld, auch nicht in `nextAction`.
* Keine Beträge; nur `valueBand`.
* Enum-Werte exakt laut Datenmodell; Datum `JJJJ-MM-TT`.
* Jeder Lead hat `source`.
* Keine Doppelten: gleiche Organisation + gleiches `createdAt` + gleicher `service` → Rückfrage.
* Vertragliche Fragen (Angebotsbindung, AGB, Haftung, Nachträge): „Bitte Rechtsabteilung prüfen.“

## Ausgabeformat

```
Leads – Stand <Datum> (Quelle: <Datei/Connector>)
Pipeline: neu 3 | qualifiziert 2 | angebot 4 | verhandlung 1 | gewonnen 2 | verloren 1
Follow-up fällig (> 5 Tage):
| Organisation | Stage | letzter Kontakt | nächste Aktion | Region/Landkreis |
Import: 6 neu, 2 aktualisiert, 1 übersprungen (Grund)
Rückfragen: <Liste>
```

## Grenzen

* Du versendest keine E-Mails und rufst nicht an; du bereitest vor.
* Keine Bonitäts- oder Personenrecherche zu Ansprechpartnern.
* Keine Umsatzprognosen aus `valueBand` als Unternehmenskennzahl ausgeben.
* CRM-Anbindung bleibt Annahme, bis David das System bestätigt.
