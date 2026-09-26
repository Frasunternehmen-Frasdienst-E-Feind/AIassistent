# Konvention: Frontmatter für Dateien in `Marketing/Content/`

Jede Content-Datei (Markdown) beginnt mit diesem YAML-Block. Der Skill
`content-pipeline` liest ihn bei `/cockpit-sync` und schreibt daraus `content/<id>`
(Schema in `kontext/datenmodell.md`).

Dateiname: `JJJJ-MM-TT_thema-kurz_kanal.md` (Datum = geplantes Veröffentlichungsdatum),
z. B. `2026-10-06_saisonrueckblick_linkedin.md`.

```yaml
---
id: saisonrueckblick-linkedin-2026        # kleinbuchstaben-mit-bindestrich, eindeutig
title: "Saisonrückblick 2026"
channel: linkedin                          # linkedin | website | newsletter | referenzbericht
status: entwurf                            # idee | entwurf | review | freigegeben | veroeffentlicht
statusSince: 2026-09-24                    # Datum der letzten Statusänderung
region: Brandenburg                        # Region oder leer
projectType: kaltfraesen                   # Leistungs- bzw. Projektart
plannedDate: 2026-10-06
publishedDate:                             # erst bei status veroeffentlicht
approvedBy:                                # Rolle, z. B. "Geschäftsführung" – keine Namen
clientApproved: false                      # true nur mit Freigabe Vertrieb/GF
sources:                                   # Quelle je Fakt (Output-Regel 5)
  - "Projektbericht Referenzen/2026_ll_beispiel/bericht.md"
note: ""
---
```

Regeln:
* `status` und `statusSince` bei jeder Statusänderung gemeinsam ändern; daraus
  ermittelt das Cockpit hängende Entwürfe (> 14 Tage im Status `entwurf`).
* `source` in `db` ist der Dateipfad dieser Datei.
* Keine personenbezogenen Daten und keine Preise im Frontmatter.
* Übergang zu `freigegeben` erst nach `/compliance-check` ohne blockierenden Befund.
