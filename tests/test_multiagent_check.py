"""Tests für das Prüfskript des Plugins multiagent-orchestrierung."""
import importlib.util
from pathlib import Path

_PATH = Path(__file__).resolve().parents[1] / "multiagent-orchestrierung/skills/multiagent-konfig/scripts/check_multiagent.py"
_spec = importlib.util.spec_from_file_location("check_multiagent", _PATH)
mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mod)


def test_gueltiger_block_ohne_fehler():
    errors, _ = mod.check({"multiagent": {
        "type": "multiagent_20261001",
        "subagents": {"type": "enabled", "inline_agents": {"type": "disabled"},
                      "predefined_agents": ["agent_a", {"type": "self"}]},
        "workflows": {"type": "disabled"},
        "advisor": {"type": "enabled", "model": "claude-opus-5-5"},
    }})
    assert errors == []


def test_inline_aus_ohne_liste_ist_fehler():
    errors, _ = mod.check({"type": "multiagent_20261001",
                           "workflows": {"type": "enabled", "inline_agents": {"type": "disabled"}}})
    assert any("keine predefined_agents" in e for e in errors)


def test_mehr_als_20_agenten():
    errors, _ = mod.check({"type": "multiagent_20261001",
                           "subagents": {"type": "enabled", "predefined_agents": [f"agent_{i}" for i in range(21)]}})
    assert any("höchstens 20" in e for e in errors)


def test_advisor_ohne_model_und_mit_zusatzfeld():
    errors, _ = mod.check({"type": "multiagent_20261001",
                           "advisor": {"type": "enabled", "max_uses": 3}})
    assert any("braucht model" in e for e in errors)
    assert any("nur type und model" in e for e in errors)


def test_reservierte_namen():
    errors, _ = mod.check({
        "tools": [{"type": "custom", "name": "ant__x"}],
        "multiagent": {"type": "multiagent_20261001",
                       "advisor": {"type": "enabled", "model": "m"},
                       "subagents": {"type": "enabled", "predefined_agents": ["anthropic.advisor"]}},
    })
    assert any("ant__" in e for e in errors)
    assert any("reserviert" in e and "anthropic.advisor" in e for e in errors)


def test_ungueltiger_eintrag_und_typ():
    errors, _ = mod.check({"type": "foo",
                           "subagents": {"type": "enabled", "predefined_agents": [{"id": "agent_x"}]}})
    assert len(errors) == 2


def test_weggelassene_workflows_geben_hinweis():
    errors, warnings = mod.check({"type": "multiagent_20261001"})
    assert errors == [] and any("Standard" in w for w in warnings)
