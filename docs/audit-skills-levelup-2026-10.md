# Audit: Skills & LevelUp-Kandidaten (Stand 12.10.2026)

Erhoben in einer Claude-Code-Cloud-Sitzung über ListSkills, ListPlugins,
Artefakt-Liste, Sitzungsliste und Repo-Liste. Private Projekte stehen hier nur
als Summe (Repository ist öffentlich), Details nur im Chat.

## 1. Bestand

| Bereich | Befund |
|---|---|
| claude.ai-Skills | 40 aktiv (Anthropic-Standard, eigene Feind-/Privat-Skills, Writing-Reihe) |
| claude.ai-Plugins | 0 aktiv |
| Repo-Skills `.claude/skills` | 12 (Auswahl Matt Pocock + `cockpit-sync`); 3 davon nur per `/name` (`handoff`, `teach`, `wait-what`) – gewollt |
| Repo-Agent | `messe-manager` |
| Repos | `AIassistent` (öffentlich), `e2sesign-reposit` (privat) |
| Artefakte | 61, davon ca. 45 Arbeit, ca. 16 privat |
| Code-Sitzungen | ca. 60 (Schwerpunkte: Feind Cockpit, Arbeitszeitkonto, InfraTech 2027, Fahrzeug) |
| Claude-Design-Projekte | aus dieser Umgebung nicht auflistbar – **unbekannt** |
| `/doctor`, `/design`, `/design-sync` | in dieser Cloud-Sitzung nicht als Befehl verfügbar; nur lokal in Claude Code prüfbar |

## 2. Skill-Befunde (Handlungsbedarf)

1. **`brand-guidelines` ist Anthropic-CI**, nicht Feind. Wird es bei
   „Markenfarben“ automatisch geladen, entstehen falsche Farben. Maßnahme:
   eigenen Skill `feind-brand` aus `branding/feind-ci.tokens.json` bauen
   (`skill-creator`) und bei Feind-Arbeit bevorzugen.
   **Erledigt (Repo):** `.claude/skills/feind-brand` mit Generator
   `scripts/tokens-to-css.mjs`. Für claude.ai: Ordner als ZIP unter
   „Customize → Skills“ hochladen (manuell durch David).
2. **`feind-plugin-customizer`**: Die Beschreibung ist Review-Text statt
   Auslöser – der Skill wird praktisch nie gezogen. Maßnahme: Beschreibung
   mit `skill-creator` neu schreiben oder Skill deaktivieren.
   **Vorschlag zum Einfügen (claude.ai, manuell):** „Passt Claude-Plugins und
   Skills an Fräsdienst-Service E. Feind GmbH an (CI, Tonalität, B2B-Fräsen,
   Marketing/Events). Nutzen bei ‚Plugin/Skill für Feind anpassen‘,
   ‚Plugin-Vorlage auf Feind umbauen‘.“
3. **CLAUDE.md verweist auf `grill-me`, `to-spec`, `to-tickets`** – im Repo
   heißt der erste `grilling`, die anderen beiden fehlen. Maßnahme: Verweise
   korrigieren oder die zwei Skills aus Matts Sammlung nachziehen.
   **Erledigt (über main, PR #64ff.):** komplette Sammlung inkl. `grill-me`,
   `to-spec`, `to-tickets` und `setup-matt-pocock-skills` liegt in
   `.claude/skills/`. Vor erstem `/to-spec` einmal `/setup-matt-pocock-skills`
   ausführen (Tracker festlegen).
4. **Namensdoppelung `prototype`** (claude.ai-Skill und Repo-Skill, unterschiedliches
   Verhalten). Maßnahme: einen umbenennen.

## 3. LevelUp-Kandidaten (Arbeit), nach Hebel

| # | Cluster | Artefakte | Problem | Skills | Ergebnis |
|---|---|---|---|---|---|
| 1 | Zeitwirtschaft | Arbeitszeitkonto 1626, Zeit-Hub, Stundenzettel, Stundenzettel-Dashboard, Zeiterfassung, Stempeluhr-Projekt, Zeitmanagement-Tool UI-Konzept | 7 Stände, eine Quelle nötig | `dataviz`, `mobile-native`, `selbst-review-5-achsen` | Arbeitszeitkonto 1626 als einzige App, Rest als Archiv markieren |
| 2 | Feind Cockpit | Feind Cockpit, Feind Cockpit (Copy), E.F. Cockpit, Diagrammfarben, KOMPASS KPI-Tracker | Kopien, KPI-Tracker separat | `dataviz`, `emil-design-eng`, `mobile-native`, `cockpit-sync` | ein Cockpit mit KPI-Modul, Kopien archivieren |
| 3 | InfraTech 2027 Rotterdam | Hotels, Hotel-Cockpit V7, Nutzertest, Giveaway-Board/-Mockups, ToDo-Liste, Aufgabenfluss, Standkonzept, Motive, Poster, Messewand | 11 Einzelseiten | `messe-manager`, `feind-grafik-generator`, `pptx`, `canvas-design` | Messe-Cockpit als Hub + Stand-Präsentation (PPTX) |
| 4 | Design-System | CI-Leitfaden, Farbsystem 1.0, Design System, Diagrammfarben | CI verteilt | `skill-creator`, `theme-factory` | Skill `feind-brand` + ein Design-System-Artefakt |
| 5 | Fuhrpark | Fahrzeug-Cockpit, Fahrzeug-Manager (+App-Design, Mockups), APK-Rollout, Fahrten-Dashboard, Kartenansicht, MapEngine Demo ×2 | Zuordnung Arbeit/privat offen | `web-artifacts-builder`, `mobile-native` | erst Zuordnung klären |

## 4. Risiken

* **Datenverlust beim Zusammenführen** – Artefakte mit `db`-Speicher nie
  überschreiben, nur neu anlegen und alte als Archiv kennzeichnen.
* **Falsche CI** durch `brand-guidelines` (siehe 2.1).
* **Guthaben** – je Cluster eine eigene Sitzung; nicht alle parallel.

## 5. Offene Bestätigungen

* ~~Reihenfolge~~ – entschieden 12.10.: Skills (4) → Zeitwirtschaft (1) →
  InfraTech (3) → Cockpit (2).
* ~~Fuhrpark~~ – gemischt: Firmenfahrzeuge (Arbeit) und Privatfahrzeuge vor
  dem LevelUp trennen.
* Claude-Design-Projekte: Liste/Links liefern, falls dort Stände liegen.
