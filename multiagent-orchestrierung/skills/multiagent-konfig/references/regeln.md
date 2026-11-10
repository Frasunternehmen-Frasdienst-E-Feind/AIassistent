# Regeln: Multiagenten-Orchestrierung (Managed Agents, Beta)

Quelle: platform.claude.com/docs/de/managed-agents/multiagent-orchestration
(Stand der eingefügten Doku, Beta-Header `managed-agents-2026-04-01`,
`anthropic-version: 2026-10-21`). Bei Widerspruch gilt die aktuelle Doku.

## Inhalt
1. Drei Ansätze und wann welcher passt
2. Aufbau des `multiagent`-Blocks
3. Einträge in `predefined_agents`
4. Harte Regeln (400-Fehler)
5. Update-Verhalten
6. Advisor
7. Umstieg vom Typ `coordinator`
8. Datenschutz und Kosten

## 1. Drei Ansätze

| Ansatz | Passt, wenn | Zu beachten |
|---|---|---|
| Subagents | Der Agent soll nach dem Bericht nachhaken oder Spezialisten mit eigenem Prompt/Tools nutzen | Eine Ebene tief; max. 25 Child-Threads je Session (inaktive zählen mit; Advisor- und Workflow-Threads nicht) |
| Dynamische Workflows | Viele Teile, parallele Arbeit, lange Aufgaben (Audits, Migrationen, Recherche, Gegenprüfung) | Jeder Agent kostet Token → Session-Budget setzen; im System-Prompt sagen, wann ein Run genutzt wird; keine Folgenachrichten an Run-Threads |
| Advisor | Ein Agent arbeitet selbst, holt an Schlüsselstellen (Plan, Endprüfung) Rat eines stärkeren Modells | Nur der primäre Thread konsultiert; Abrechnung zum Preis des Advisor-Modells |

## 2. Aufbau

```json
{
  "multiagent": {
    "type": "multiagent_20261001",
    "subagents": { "type": "enabled", "inline_agents": {"type": "enabled"}, "predefined_agents": [] },
    "workflows": { "type": "enabled", "inline_agents": {"type": "enabled"}, "predefined_agents": [] },
    "advisor":   { "type": "disabled" }
  }
}
```

Standardwerte: `subagents` und `workflows` aktiviert, je mit `inline_agents`
aktiviert, Listen leer; `advisor` deaktiviert. Ausschalten: `{"type": "disabled"}`.

* Vordefinierter Agent = bereits erstellter Agent mit eigener Konfiguration.
* Inline-Agent = vom Agenten oder Workflow zur Laufzeit definiert; nutzt Modell,
  Tools, MCP-Server und Skills des Session-Agenten. Er lässt sich nicht einzeln
  einschränken.
* `subagents.predefined_agents` und `workflows.predefined_agents` sind getrennte Listen.
* Ein Workflow-Inline-Agent nutzt das Session-Modell. Anderes Modell → als Agent
  anlegen und in `workflows.predefined_agents` aufnehmen.

## 3. Einträge in `predefined_agents`

* `"agent_…"` (String) = Kurzform für `{"type": "agent", "id": …}`
* `{"type": "agent", "id": "agent_…"}` → wird beim Speichern auf die neueste Version festgelegt
* `{"type": "agent", "id": "agent_…", "version": 2}` → feste Version
* `{"type": "self"}` → Kopien des Agenten selbst (Session-Überschreibungen gelten mit)

## 4. Harte Regeln (sonst 400)

1. `inline_agents` deaktiviert → mindestens ein Eintrag in derselben `predefined_agents`-Liste.
2. Höchstens 20 eindeutige Agenten je Liste.
3. Eine Ebene: Ein referenzierter Agent darf selbst keinen `multiagent`-Block haben
   (`self` ist erlaubt).
4. Inferenz-Geografie (`model.inference_geo`) muss beim Agenten und allen gelisteten
   Agenten gleich sein oder überall fehlen.
5. Aktivierter Advisor: genau `type` und `model`; kein gelisteter Agent darf
   `anthropic.advisor` heißen; der Advisor kann nicht in einer Liste stehen.
6. Advisor-Paarung: Das Agentenmodell darf nicht leistungsfähiger sein als der
   Advisor (gleich ist erlaubt); gültige Paare laut Tabelle „Modellkompatibilität“
   des Advisor-Tools.
7. Präfix `ant__` für benutzerdefinierte Tool-Namen ist reserviert.
8. `limited`-Umgebung: Jeder MCP-Host aller beteiligten Agenten muss in
   `allowed_hosts` stehen (oder `allow_mcp_servers: true`).
9. Jedes gesendete Objekt braucht seinen `type`.

## 5. Update-Verhalten (Typ bleibt `multiagent_20261001`)

* Weggelassen → gespeicherter Wert bleibt.
* `null` → Standardwert (bei `workflows`/`subagents` also wieder **aktiviert**).
* Gesendete `predefined_agents`-Liste ersetzt die gespeicherte.
* Einstellung mit anderem `type` ersetzt die gespeicherte; fehlende Felder → Standard.
* Bestehende Sessions ändern sich nicht; Session nach Update neu erstellen.
* Gelistete Agenten bleiben auf die beim Speichern aufgelöste Version festgelegt.

## 6. Advisor

* `{"type": "enabled", "model": "<id>"}`; keine Felder `max_uses`, `max_tokens`, `caching`.
* Konsultation läuft als Thread `anthropic.advisor`, Rat kommt als
  `agent.thread_message_received`. Manche Advisor-Modelle liefern nur
  `[{"type": "redacted"}]` an den Client → Client muss `text` und `redacted` behandeln.
* Fehlgeschlagene Konsultation lässt den Turn nicht scheitern.
* Konsultationen spät in langen Sessions kosten mehr Input-Token.

## 7. Umstieg vom Typ `coordinator`

`coordinator` kann delegieren und einen Advisor nutzen, aber keine Workflows und
keine Inline-Agenten. Beim Umstieg ersetzt das Update den **ganzen** Block: Liste
und Advisor erneut senden, sonst gehen sie verloren. Weggelassene `workflows` und
`inline_agents` werden aktiviert – bewusst auf `disabled` setzen, wenn nicht gewünscht.

## 8. Datenschutz und Kosten

* Nicht ZDR- und nicht HIPAA-berechtigt; Transkripte bleiben bis zum Löschen.
* Session-Budget nur bei Session-Erstellung setzbar; Runs pausieren am Budget.
* Vault-Anmeldedaten gelten für alle Threads einer Session.
