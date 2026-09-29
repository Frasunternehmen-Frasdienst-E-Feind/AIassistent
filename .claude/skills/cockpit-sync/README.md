# Skill `cockpit-sync`

Schreibt Marketing-Daten (Content, Leads, Ausschreibungen, Events, SEO, Referenzen) aus den
Marketing-Skills in den Artefakt-Speicher des konsolidierten Feind Cockpits und setzt danach
`meta/sync`. Anweisungen für Claude: `SKILL.md`. Schema: `cockpit/docs/SCHEMA.md`.

## Installation und Aktivierung

- Die Skill-Datei liegt im Repository unter `.claude/skills/cockpit-sync/SKILL.md`. Claude Code
  lädt sie automatisch, wenn eine Sitzung in diesem Repository startet. Aufruf mit
  `/cockpit-sync`, „Cockpit aktualisieren“ oder „Daten ins Cockpit“.
- Voraussetzung: Unter `cockpit/README.md` → „Live-Artefakt“ ist die Adresse eingetragen.
  Ohne Adresse fragt der Skill nach und schreibt nichts.
- **Offen, von David zu bestätigen:** Ob der bisher in claude.ai/Cowork genutzte Skill
  „cockpit-sync“ (Plugin `feind-marketing-cockpit`) durch diese Version ersetzt werden muss.
  Bis dahin nicht beide Versionen gegen dasselbe Artefakt laufen lassen, da die alte Version
  noch nach `leads/<id>` schreibt.

## Umbenennung `leads` → `mkt_leads`

Seit v1.0 liegen Marketing-Leads in `mkt_leads/<id>`. `leads/counts` gehört dem
Messe-Lead-Zähler der InfraTech-Welt (nur Stückzahlen). Liefert ein Quell-Skill noch
`leads/<id>`, schreibt `cockpit-sync` nach `mkt_leads/<id>`. Vorhandene Alt-Dokumente übernimmt
die Migration (Admin → Migration bzw. `npm run migrate:cockpit`), ohne etwas zu löschen.

## Verbotene Pfade

Der Skill schreibt **nie** in:

`tasks`, `settings/*`, `budget/*`, `leads/counts`, `acquisition/*`, `planning/*`, `admin/*`,
`admin_requests/*`, `activity`, `overrides`.

Erlaubt sind nur `content`, `mkt_leads`, `tenders`, `events`, `seo_keywords`, `seo_traffic`,
`seo_gaps`, `references` und `meta/sync`.

## Beispiel: `ArtifactData`-Aufruf (`batch`)

Neue Dokumente per `set`, geänderte per `update` mit `if_version` aus dem vorherigen Lesen,
höchstens 50 Schreibvorgänge je Paket. Werte sind Beispieldaten.

```json
{
  "action": "batch",
  "url": "<Adresse aus cockpit/README.md → Live-Artefakt>",
  "writes": [
    {
      "op": "set",
      "collection": "content",
      "doc_id": "c-2026-10-linkedin-kaltfraesen",
      "data": {
        "title": "Kaltfräsen im Innerortsbereich",
        "channel": "linkedin",
        "status": "entwurf",
        "plannedDate": "2026-10-06",
        "publishedDate": "",
        "statusSince": "2026-09-28",
        "region": "Brandenburg",
        "projectType": "Kaltfräsen",
        "note": ""
      }
    },
    {
      "op": "set",
      "collection": "mkt_leads",
      "doc_id": "l-2026-0412",
      "data": {
        "organisation": "Musterbau GmbH",
        "orgType": "bauunternehmen",
        "channel": "website",
        "stage": "qualifiziert",
        "service": "Straßenfräsen",
        "region": "Brandenburg",
        "landkreis": "Dahme-Spreewald",
        "valueBand": "10–50 T€",
        "lastContact": "2026-09-25",
        "createdAt": "2026-09-20",
        "nextAction": "Angebot vorbereiten",
        "nextActionDate": "2026-10-02"
      }
    },
    {
      "op": "update",
      "collection": "meta",
      "doc_id": "sync",
      "if_version": 3,
      "data": {
        "content": { "at": "2026-09-28T10:15:00+02:00", "source": "content-pipeline" },
        "leads": { "at": "2026-09-28T10:15:00+02:00", "source": "lead-tracking" }
      }
    }
  ]
}
```

Existiert `meta/sync` noch nicht, einmalig per `set` anlegen. `if_version` ist die Zahl `version` aus dem
vorherigen Lesen (hier beispielhaft `3`); Feldnamen `writes`/`op`/`collection`/`doc_id`/`data`/`if_version`
entsprechen der `ArtifactData`-Definition (batch ≤ 50 Einträge).

## Prüfliste nach dem Lauf

- [ ] Nur erlaubte Sammlungen beschrieben, kein Schreibvorgang auf `leads/<id>` oder `leads/counts`.
- [ ] Leads enthalten nur Organisationen, keine Namen, E-Mails oder Telefonnummern von Personen.
- [ ] Referenzen mit Kundennamen nur bei `clientApproved: true`.
- [ ] `meta/sync` enthält für jedes bearbeitete Modul `at` und `source`.
- [ ] Im Cockpit (Admin → Status → Datenbestand) stimmen die Zählwerte mit der Meldung überein.
- [ ] Meldung an David: je Modul neu / geändert / unverändert, Konflikte, fehlende Einwilligungen
      („Einwilligung erforderlich“), Rechtsthemen („Bitte Rechtsabteilung prüfen“).
