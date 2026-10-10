# Agent-Skills

Kuratierte Auswahl aus **„Skills For Real Engineers"** von Matt Pocock
(<https://github.com/mattpocock/skills>), MIT-lizenziert (siehe `LICENSE`).
Übernommen sind die Kategorien `engineering`, `productivity` und `misc` (Stand `f3fc563`,
v1.3.1, 07.10.2026); ausgelassen: `in-progress/*` und `engineering/code-review`
(gleichnamig mit dem eingebauten `/code-review`). Konfiguration: `docs/agents/`.

Claude Code erkennt sie automatisch über `.claude/skills/<name>/SKILL.md`.

## Enthaltene Skills

| Skill | Zweck (Originaltext) |
|---|---|
| `ask-matt` | Ask which skill or flow fits your situation |
| `codebase-design` | Shared vocabulary for designing deep modules |
| `diagnosing-bugs` | Diagnosis loop for hard bugs and performance regressions |
| `domain-modeling` | Build and sharpen a project's domain model |
| `git-guardrails-claude-code` | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute |
| `grill-me` | A relentless interview to sharpen a plan or design |
| `grill-with-docs` | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go |
| `grilling` | Grill the user relentlessly about a plan, decision, or idea |
| `handoff` | Compact the current conversation into a handoff document for another agent to pick up |
| `implement` | Implement a piece of work based on a spec or set of tickets |
| `implement-spec` | Implement the result of /to-spec and /to-tickets in code |
| `improve-codebase-architecture` | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick |
| `migrate-to-shoehorn` | Migrate test files from `as` type assertions to @total-typescript/shoehorn |
| `pr` | Use when writing a PR body |
| `prototype` | Build a throwaway prototype to answer a design question |
| `research` | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo |
| `resolving-merge-conflicts` | Use when you need to resolve an in-progress git merge/rebase conflict |
| `retro` | Conduct a retrospective on a coding session |
| `scaffold-exercises` | Create exercise directory structures with sections, problems, solutions, and explainers that pass linting |
| `setup-matt-pocock-skills` | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout |
| `setup-pre-commit` | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo |
| `tdd` | Test-driven development |
| `teach` | Teach the user a new skill or concept, within this workspace |
| `to-questionnaire` | Turn a decision you can't fully answer into a questionnaire for someone else to fill in |
| `to-spec` | Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed |
| `to-tickets` | Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker) |
| `triage` | Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs |
| `wait-what` | Stop |
| `wayfinder` | Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear |
| `wizard` | Generate an interactive bash wizard that walks a human through steps only they can perform |
| `writing-for-agents` | Writing documents for agents |

## Aktualisieren

Diese Kopien sind editierbar. Wer die gepflegte, automatisch aktualisierte Fassung
möchte, kann stattdessen Matts Claude-Code-Plugin nutzen
(`/plugin install mattpocock-skills`) – dann diese Kopien entfernen, um Doppelungen
zu vermeiden.

_Herkunft/Änderungen: unverändert aus mattpocock/skills @ `f3fc563` (08.10.2026);
`resolving-merge-conflicts` stammt aus dem Upload vom 2026-09. `cockpit-sync` ist ein eigener Skill dieses Repos._
