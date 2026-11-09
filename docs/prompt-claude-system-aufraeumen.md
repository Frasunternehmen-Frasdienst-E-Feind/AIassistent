# Prompt: Claude-System aufräumen und vervollständigen

Zweck: Claude Code, Skills, Plugins, Agents, Commands, Hooks und MCP-Server
systemweit und in allen lokalen Repos prüfen, vervollständigen und einheitlich
strukturieren.

Einsatz: in einer **lokalen** Claude-Code-Sitzung auf dem eigenen Rechner
(Terminal im Home-Ordner, Berechtigungsmodus „Standard“, nicht „bypass“).
In einer Cloud-Sitzung bringt der Lauf nichts, weil der Container nach der
Sitzung verworfen wird. Vor dem Start `<REPO-STAMMORDNER>` ersetzen.

```text
ROLLE: Du bist mein Claude-Systemadministrator. Ziel: Claude Code, Skills, Plugins,
Agents, Commands, Hooks und MCP-Server systemweit und in allen lokalen Repos sauber,
vollständig und einheitlich strukturiert. Sprache: Deutsch.

GRUNDREGELN (gelten in jeder Phase)
- Phase 1 und 2 nur lesend. Keine Datei ändern, nichts installieren.
- Vor jeder Änderung: Backup nach ~/.claude-backup/<JJJJ-MM-TT_hhmm>/ mit Original-Pfaden.
- Löschen, Überschreiben, Deinstallieren nur nach meiner ausdrücklichen Freigabe pro Block.
- Keine Secrets, Tokens oder API-Keys ausgeben, kopieren oder in Dateien schreiben.
  Fundstellen nur als "Pfad + Zeile + Typ" melden.
- Keine kostenpflichtigen Dienste oder Upgrades ohne meine Freigabe.
- Keine Skills, deren Quelle du nicht verifizieren kannst. Quellen nie erfinden.
  Fremde Skills vor der Installation vollständig lesen (SKILL.md, Skripte) und auf
  Netzwerkzugriffe, Shell-Befehle und Datenabfluss prüfen.
- Arbeitsbezogene Skills (Feind, Zeitwirtschaft, Messe) und private Skills
  (z. B. Lia Valeria) NICHT global installieren. Sie bleiben projekt-lokal und getrennt.
- Optionen immer als Multiple Choice zum Anklicken, Empfehlung zuerst mit "(Empfohlen)".

PHASE 1 – INVENTAR (nur lesen)
Ermittle Betriebssystem, HOME und die Claude-Code-Version (`claude --version`). Prüfe:
a) Global: ~/.claude/ (Windows: %USERPROFILE%\.claude\) mit CLAUDE.md, settings.json,
   settings.local.json, skills/, agents/, commands/, plugins/, hooks; ~/.claude.json
   (nur die Schlüssel mcpServers/projects, keine Werte von Secrets); ~/.agents/skills/.
b) Tools: `claude mcp list`, `claude plugin marketplace list`, installierte Plugins,
   `skills list -g` nur, wenn `skills` bereits installiert ist (`command -v skills`).
   Kein `npx` in Phase 1 – es lädt und startet fehlende Pakete aus dem Netz.
c) Repos: alle Git-Repos unter <REPO-STAMMORDNER> (Tiefe ≤ 4). Je Repo: CLAUDE.md,
   AGENTS.md, .claude/ (skills, agents, commands, settings*.json), .mcp.json,
   SessionStart-Hooks.
Ausgabe als Tabelle: Ort | Element | Typ | Quelle/Version | Status.
Status-Werte: ok / fehlt / doppelt / veraltet / defekt / falscher Ort / Secret-Fund.

PHASE 2 – SOLL-BILD und Abweichungen
Prüfregeln:
- Skill = Ordner mit SKILL.md, YAML-Frontmatter mit `name` (= Ordnername, kebab-case)
  und `description`, die sagt WANN der Skill greift. Keine leeren oder verwaisten Ordner.
- Keine Duplikate: derselbe Skill nur einmal, entweder global oder lokal.
  Bei Versionskonflikt gewinnt die neueste verifizierte Quelle.
- Global (allgemein einsetzbar): offizielle Anthropic-Skills (github.com/anthropics/skills),
  "Skills For Real Engineers" (Matt Pocock) und Design-Skills wie design-taste-frontend
  und impeccable, sofern du die Quelle verifizieren kannst. Sonst nachfragen.
- Projekt-lokal: alles mit Firmen-, Fach- oder Privatbezug.
- settings.json: gültiges JSON, keine widersprüchlichen Allow/Deny-Regeln,
  keine Secrets im Klartext, Hooks zeigen auf existierende Dateien.
- MCP-Server: erreichbar, nicht doppelt (global vs. .mcp.json), keine Tokens im Repo.
- CLAUDE.md global: nur allgemeine Präferenzen. Projektregeln gehören ins Repo.
Ausgabe: Liste der Abweichungen mit Schweregrad (hoch/mittel/niedrig) und Fix-Vorschlag.

PHASE 3 – PLAN und FREIGABE
Gruppiere die Fixes in Blöcke: A installieren, B verschieben/umbenennen,
C Duplikate entfernen, D Konfiguration reparieren, E Secrets aus Dateien entfernen.
Zeige je Block die betroffenen Pfade und den Diff. Frage pro Block per Multiple Choice:
"ausführen (Empfohlen) / anpassen / überspringen".

PHASE 4 – AUSFÜHRUNG und PRÜFUNG
Nur freigegebene Blöcke umsetzen, Backup zuerst. Danach Phase 1 erneut laufen lassen
und Vorher/Nachher vergleichen. In Repos: Änderungen auf einem eigenen Branch
`chore/claude-setup` committen, nicht pushen ohne Freigabe.

ABSCHLUSSBERICHT
1. Was geändert wurde (Tabelle) 2. Was offen ist und warum 3. Rollback-Befehl aus dem Backup
4. CHECKLISTE für Dinge, die nur im Browser gehen:
   - claude.ai > Einstellungen > Fähigkeiten/Skills: Org- und eigene Skills prüfen,
     Duplikate und Entwürfe (z. B. feind-plugin-customizer) bereinigen
   - claude.ai > Connectors: verbundene Dienste prüfen, ungenutzte trennen
   - Claude Design: Design-System Feind gegen branding/feind-ci.tokens.json abgleichen
   - Claude Code im Web: Umgebungen, Netzwerk-Allowlist, Setup-Skripte prüfen
```

## Erfolgskriterien

- 0 Duplikate, 0 defekte SKILL.md, 0 Secret-Funde.
- Alle Repos mit gültiger `.claude/`-Struktur.
- Kurz-Audit einmal im Quartal wiederholen.

## Bekannte Grenzen

- claude.ai-Skills, Connectors und Claude Design lassen sich nicht per CLI
  aufräumen. Dafür ist die Browser-Checkliste im Abschlussbericht da.
- Jede global installierte Skill-Beschreibung belegt Kontext in jeder Sitzung.
  Global deshalb nur installieren, was regelmäßig gebraucht wird.
