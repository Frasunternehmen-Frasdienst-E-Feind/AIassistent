---
name: multiagent-konfig
description: Erzeugt und prüft die Multiagenten-Konfiguration für Claude Managed Agents – den `multiagent`-Block (Typ `multiagent_20261001` oder `coordinator`) mit Subagents, dynamischen Workflows und Advisor, als JSON, API-Aufruf oder Markdown-Agentendatei für `ant apply`. Nutze diesen Skill immer, wenn jemand ein Agententeam, einen Lead-/Koordinator-Agenten, Subagenten, Workflow-Runs, einen Advisor, `predefined_agents`, `inline_agents` oder den Umstieg von `coordinator` plant, aufsetzt, debuggt (z. B. 400-Fehler) oder prüfen lassen will – auch wenn nur „mehrere Agenten zusammenarbeiten lassen“ gesagt wird. Nicht für Claude-Code-Subagenten (`.claude/agents/`) oder das Workflow-Werkzeug dieser Session.
---

# Multiagenten-Konfiguration (Managed Agents)

Ziel: aus einer fachlichen Beschreibung eine Konfiguration machen, die beim ersten
Speichern durchgeht und nicht mehr kostet als nötig. Die Regeln stehen in
`references/regeln.md` – lies sie vor dem Entwurf, denn die API lehnt Verstöße mit
400 ab und manche Standardwerte (Workflows an, Inline-Agenten an) überraschen.

## Ablauf

1. **Bedarf klären (max. 3 Fragen, sonst mit markierten Annahmen arbeiten):**
   Welche Aufgaben? Müssen Teilergebnisse nachgefragt werden (→ Subagents) oder
   laufen viele gleichartige Teile parallel (→ Workflows)? Braucht es an
   Schlüsselstellen ein stärkeres Urteil (→ Advisor)? Gibt es schon Agenten-IDs?
   Soll der Zugriff auf gelistete Agenten beschränkt sein?
2. **Ansatz wählen und begründen** mit der Tabelle in `references/regeln.md`
   Abschnitt 1. Nur einschalten, was gebraucht wird: Alles, was nicht gebraucht
   wird, ausdrücklich auf `{"type": "disabled"}` setzen. Der Grund: Weglassen
   heißt bei `subagents`/`workflows` aktiviert, und jeder Workflow-Agent kostet Token.
3. **Entwurf schreiben** im Format, das gewünscht ist (Standard: Markdown-Dateien für
   `ant apply`, weil dort Pfade statt IDs genügen; sonst JSON oder SDK-Code).
   Unbekannte IDs als Platzhalter `agent_…[PRÜFEN]` – nie erfinden.
   **Modelle:** Nimm die aktuelle Generation (z. B. Arbeitsmodell `claude-sonnet-5-5`,
   Advisor `claude-opus-5-5`; Lead mit Opus nur, wenn die Synthese schwer ist), keine
   älteren Versionen wie 4.x, außer der Nutzer will sie. Der Grund: Ältere Modelle
   sind meist teurer pro Leistung, und die Advisor-Paarung braucht ein Agentenmodell,
   das nicht stärker ist als der Advisor.
4. **System-Prompt-Satz mitliefern**, der sagt, wann ein Workflow-Run genutzt wird
   und wann nicht, sobald Workflows aktiv sind. Ohne ihn entscheidet der Agent frei.
   Ergänze dort eine Ausfall-Regel („scheitert ein Agent, bricht der Run nicht ab;
   das Teil wird als nicht abgedeckt gemeldet“) und ein Zeitlimit für den Run –
   sonst fehlen bei 30+ Teilen still Ergebnisse oder der Run läuft offen weiter.
5. **Prüfen:** den `multiagent`-Block (oder die ganze Agentendefinition als JSON)
   speichern und `python3 scripts/check_multiagent.py <datei>` ausführen. Fehler
   beheben, Hinweise übernehmen. Das Skript prüft nur, was ohne API geht; die
   übrigen Punkte (eine Ebene, Inferenz-Geografie, Modellpaarung, MCP-Hosts bei
   `limited`) als Checkliste nennen.
6. **Ausgabe:**
   - Konfiguration (kopierfertig)
   - Begründung in 2–4 Sätzen: warum dieser Ansatz, was bewusst aus ist
   - Prüfergebnis des Skripts
   - Offene Punkte: Platzhalter, Budget für die Session, Session nach Update neu erstellen

## Typische Stolpersteine

- `inline_agents` aus, aber leere Liste → 400.
- Gelisteter Agent hat selbst einen `multiagent`-Block → 400 (nur eine Ebene; `{"type": "self"}` geht).
- Umstieg von `coordinator`: Das Update ersetzt den ganzen Block – Agentenliste und
  Advisor erneut senden, sonst sind sie weg.
- `null` gesendet bei `workflows` → wird wieder aktiviert.
- Advisor-Rat kommt im Client evtl. nur als `redacted` an; wer ihn lesen muss,
  braucht ein Advisor-Modell mit Klartext-Ergebnissen.
- Datenschutz: nicht ZDR-berechtigt, Transkripte bleiben bis zum Löschen – bei
  personenbezogenen Daten erst klären (bitte Datenschutz/Rechtsabteilung prüfen).

## Beispiel

Anfrage: „Lead-Agent soll Code-Reviews an einen Reviewer und Tests an einen
Test-Agenten geben, sonst nichts.“

```markdown
---
name: Engineering Lead
model: claude-opus-5-5
tools:
  - type: agent_toolset_20260401
multiagent:
  type: multiagent_20261001
  subagents:
    type: enabled
    inline_agents: { type: disabled }
    predefined_agents:
      - ./reviewer.md
      - ./test-writer.md
  workflows: { type: disabled }
---

You coordinate engineering work. Delegate code review to the reviewer agent and
test writing to the test agent.
```

Begründung: Nachfragen beim Reviewer sind wahrscheinlich → Subagents. „Sonst
nichts“ → Inline-Agenten und Workflows aus.
