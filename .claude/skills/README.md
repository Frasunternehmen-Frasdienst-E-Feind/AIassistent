# Agent-Skills

Kuratierte Auswahl aus **„Skills For Real Engineers"** von Matt Pocock
(<https://github.com/mattpocock/skills>), MIT-lizenziert (siehe `LICENSE`).
Es ist bewusst nur eine **Teilmenge** übernommen – eigenständige Skills ohne
Matts `setup-matt-pocock-skills`/Issue-Tracker-Setup.

Claude Code erkennt sie automatisch über `.claude/skills/<name>/SKILL.md`.

## Enthaltene Skills

| Skill | Zweck |
|---|---|
| `diagnosing-bugs` | Strukturierte Diagnose-Schleife für schwer fassbare Bugs / Performance-Regressionen |
| `research` | Frage gegen vertrauenswürdige Primärquellen untersuchen, Ergebnis als Markdown ablegen |
| `tdd` | Test-getriebene Entwicklung (Red-Green-Refactor, Integrationstests) |
| `codebase-design` | Vokabular & Vorgehen zum Entwerfen „tiefer" Module / besserer Schnittstellen |
| `resolving-merge-conflicts` | Laufenden Merge-/Rebase-Konflikt sauber auflösen |
| `prototype` | Wegwerf-Prototyp zur Beantwortung einer Design-Frage |
| `handoff` | Aktuelle Konversation zu einem Übergabe-Dokument für den nächsten Agenten verdichten |
| `writing-for-agents` | Dokumente für Agenten schreiben (Skills, `AGENTS.md`, `CLAUDE.md`) |
| `grilling` | Plan/Idee/Entscheidung im harten Interview auf Schwachstellen abklopfen |
| `wait-what` | Eine missverständlich angekommene Aussage neu und klarer formulieren |
| `teach` | Ein Konzept/Skill im Kontext dieses Workspaces erklären |
| `grill-me` | Alias für `grilling` (nur per `/grill-me`) |
| `to-spec` | Gesprächsstand als Spec `docs/SPEC-<thema>.md` festhalten (nur per `/to-spec`) |
| `to-tickets` | Spec in Tracer-Bullet-Tickets unter `.scratch/<slug>/issues/` zerlegen (nur per `/to-tickets`) |

Eigene Skills (nicht aus Matts Sammlung): `cockpit-sync`, `feind-brand`.

## Aktualisieren

Diese Kopien sind editierbar. Wer die gepflegte, automatisch aktualisierte Fassung
möchte, kann stattdessen Matts Claude-Code-Plugin nutzen
(`/plugin install mattpocock-skills`) – dann diese Kopien entfernen, um Doppelungen
zu vermeiden.

_Herkunft/Änderungen: unverändert übernommen aus dem Upload
`mattpocock_skills-for-real-engineers` (Stand 2026-09), nur Auswahl getroffen. `to-spec`/`to-tickets` (2026-10 aus github.com/mattpocock/skills):
Tracker-Zeile auf lokale Dateien umgestellt, sonst unverändert._
