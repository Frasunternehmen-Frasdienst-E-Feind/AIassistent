from datetime import date
from pathlib import Path

from seo_reporting.analysis.metrics import crm_summary
from seo_reporting.config import CrmConfig
from seo_reporting.periods import Period
from seo_reporting.sources.crm import filter_period, load_leads

EXAMPLE = Path(__file__).resolve().parents[1] / "data" / "crm" / "leads.example.csv"


def test_load_example_csv_semicolon_and_german_dates():
    data = load_leads(CrmConfig(export_path=str(EXAMPLE)))
    assert data.available and len(data.leads) == 9
    aug = filter_period(data, Period("2026-08", date(2026, 8, 1), date(2026, 8, 31)))
    summary = crm_summary(aug)
    assert (summary["leads"], summary["won"], summary["value"]) == (6, 2, 30200.0)
    assert summary["by_source"][0]["source"] == "Website-Formular"


def test_missing_export_is_reported_not_raised(tmp_path):
    data = load_leads(CrmConfig(export_path=str(tmp_path / "nope.csv")))
    assert not data.available and "nicht gefunden" in data.note
    assert crm_summary(data)["leads"] == 0


def test_missing_columns(tmp_path):
    p = tmp_path / "x.csv"
    p.write_text("datum,foo\n01.01.2026,1\n", encoding="utf-8")
    data = load_leads(CrmConfig(export_path=str(p)))
    assert not data.available and "Spalten fehlen" in data.note
