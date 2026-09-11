import json
from datetime import date
from pathlib import Path

from seo_reporting.cli import main
from seo_reporting.config import load_config
from seo_reporting.periods import periods_for
from seo_reporting.report.build import build_report
from seo_reporting.report.markdown import render
from seo_reporting.sources.demo import DemoSources

ROOT = Path(__file__).resolve().parents[1]


def test_build_and_render_monthly_demo():
    cfg = load_config(ROOT / "config.example.yaml")
    report = build_report(cfg, periods_for("monthly", date(2026, 9, 1)), DemoSources(cfg))
    json.dumps(report)  # muss serialisierbar sein
    assert report["meta"]["periods"]["current"]["label"] == "2026-08"
    assert report["gsc"]["totals"]["YoY"] is not None
    assert report["crm"]["current"]["available"]
    names = [c["name"] for c in report["gsc"]["clusters"]["current"]]
    assert names[0].startswith("Marke") and names[-1].startswith("Sonstige")
    md = render(report)
    assert "# Monatsreport (Workflow 1)" in md
    assert "## 4. CRM / Leads" in md
    assert "Datenhinweise" in md  # Demo simuliert GSC-Verzögerung


def test_weekly_has_no_yoy_by_default():
    cfg = load_config(ROOT / "config.example.yaml")
    report = build_report(cfg, periods_for("weekly", date(2026, 9, 7)), DemoSources(cfg))
    assert report["gsc"]["totals"]["YoY"] is None
    assert "WoW" in report["gsc"]["totals"]
    assert "YoY" not in render(report).split("## 2.")[0]


def test_cli_writes_files(tmp_path, monkeypatch):
    monkeypatch.setenv("REPORT_OUTPUT_DIR", str(tmp_path))
    rc = main(["--config", str(ROOT / "config.example.yaml"), "monthly", "--demo", "--as-of", "2026-09-01"])
    assert rc == 0
    files = sorted(p.name for p in tmp_path.iterdir())
    assert files == ["monthly_2026-08-01_2026-08-31_demo.json", "monthly_2026-08-01_2026-08-31_demo.md"]
    data = json.loads((tmp_path / files[0]).read_text(encoding="utf-8"))
    assert data["meta"]["workflow"] == "monthly"
