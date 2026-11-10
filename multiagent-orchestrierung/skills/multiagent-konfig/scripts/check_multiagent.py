#!/usr/bin/env python3
"""Prüft einen multiagent-Block (oder eine ganze Agentendefinition) für Claude Managed Agents.

Aufruf: python3 check_multiagent.py datei.json   (oder JSON über stdin)
Exit-Code 1 bei Fehlern, sonst 0. Warnungen brechen nicht ab.
Prüft nur, was ohne API-Zugriff prüfbar ist (siehe references/regeln.md, Abschnitt 4).
"""
import json
import sys

TYPES = {"multiagent_20261001", "coordinator"}
MAX_AGENTS = 20


def _entry_key(entry):
    """Eindeutiger Schlüssel eines Listeneintrags oder None, wenn die Form ungültig ist."""
    if isinstance(entry, str):
        return ("agent", entry)
    if isinstance(entry, dict):
        if entry.get("type") == "self" and set(entry) == {"type"}:
            return ("self",)
        if entry.get("type") == "agent" and isinstance(entry.get("id"), str) and set(entry) <= {"type", "id", "version"}:
            return ("agent", entry["id"])
    return None


def check(doc):
    errors, warnings = [], []
    ma = doc.get("multiagent", doc) if isinstance(doc, dict) else None
    if not isinstance(ma, dict):
        return ["Kein multiagent-Objekt gefunden."], warnings

    mtype = ma.get("type")
    if mtype not in TYPES:
        errors.append(f"multiagent.type muss {sorted(TYPES)} sein, ist {mtype!r}.")
    if mtype == "coordinator":
        warnings.append("Typ coordinator: keine Workflows, keine Inline-Agenten. Umstieg auf multiagent_20261001 prüfen (ganzen Block senden).")

    advisor = ma.get("advisor")
    advisor_on = isinstance(advisor, dict) and advisor.get("type") == "enabled"

    for name in ("subagents", "workflows"):
        s = ma.get(name)
        if s is None:
            continue  # Standard: aktiviert
        if not isinstance(s, dict) or s.get("type") not in ("enabled", "disabled"):
            errors.append(f"{name}.type muss 'enabled' oder 'disabled' sein.")
            continue
        if s["type"] == "disabled":
            continue
        inline = s.get("inline_agents")
        if inline is not None and (not isinstance(inline, dict) or inline.get("type") not in ("enabled", "disabled")):
            errors.append(f"{name}.inline_agents braucht type 'enabled' oder 'disabled'.")
        inline_off = isinstance(inline, dict) and inline.get("type") == "disabled"
        agents = s.get("predefined_agents", [])
        if not isinstance(agents, list):
            errors.append(f"{name}.predefined_agents muss eine Liste sein.")
            continue
        keys = []
        for i, e in enumerate(agents):
            k = _entry_key(e)
            if k is None:
                errors.append(f"{name}.predefined_agents[{i}] hat keine gültige Form: {e!r}")
            else:
                keys.append(k)
                if advisor_on and k == ("agent", "anthropic.advisor"):
                    errors.append(f"{name}: 'anthropic.advisor' ist bei aktivem Advisor reserviert.")
        if len(set(keys)) > MAX_AGENTS:
            errors.append(f"{name}.predefined_agents: {len(set(keys))} Agenten, erlaubt sind höchstens {MAX_AGENTS}.")
        if len(set(keys)) < len(keys):
            warnings.append(f"{name}.predefined_agents enthält Dubletten.")
        if inline_off and not agents:
            errors.append(f"{name}: inline_agents deaktiviert, aber keine predefined_agents gelistet (400).")
        if not inline_off:
            warnings.append(f"{name}: Inline-Agenten erlaubt – sie erben Tools/MCP-Server des Session-Agenten und lassen sich nicht einzeln einschränken.")
        if name == "workflows" and mtype == "multiagent_20261001":
            warnings.append("workflows aktiv: Session-Budget bei Session-Erstellung setzen und im System-Prompt sagen, wann ein Run genutzt wird.")

    if mtype == "multiagent_20261001" and ma.get("workflows") is None:
        warnings.append("workflows nicht gesetzt = aktiviert (Standard). Bewusst so? Sonst {\"type\": \"disabled\"}.")

    if advisor is not None:
        if not isinstance(advisor, dict) or advisor.get("type") not in ("enabled", "disabled"):
            errors.append("advisor.type muss 'enabled' oder 'disabled' sein.")
        elif advisor_on:
            if not advisor.get("model"):
                errors.append("Aktivierter advisor braucht model.")
            extra = set(advisor) - {"type", "model"}
            if extra:
                errors.append(f"advisor erlaubt nur type und model, gefunden: {sorted(extra)}.")
            warnings.append("Advisor-Paarung prüfen: Agentenmodell nicht stärker als Advisor-Modell (Tabelle Modellkompatibilität).")

    if isinstance(doc, dict) and "multiagent" in doc:
        for t in doc.get("tools", []) or []:
            if isinstance(t, dict) and str(t.get("name", "")).startswith("ant__"):
                errors.append(f"Tool-Name {t['name']!r}: Präfix ant__ ist reserviert.")

    return errors, warnings


def main(argv):
    raw = open(argv[1], encoding="utf-8").read() if len(argv) > 1 else sys.stdin.read()
    try:
        doc = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"FEHLER: kein gültiges JSON ({exc})")
        return 1
    errors, warnings = check(doc)
    for e in errors:
        print(f"FEHLER: {e}")
    for w in warnings:
        print(f"HINWEIS: {w}")
    if not errors:
        print("OK: keine harten Regelverstöße gefunden (nicht prüfbar ohne API: Versionen, Geografie, eine Ebene, Modellpaarung).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
