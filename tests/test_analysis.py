from seo_reporting.analysis.brand import BrandMatcher, normalize
from seo_reporting.analysis.clusters import (
    BRAND_CLUSTER,
    OTHER_CLUSTER,
    ClusterAssigner,
    aggregate,
    compare,
    detect_movements,
    query_movers,
)
from seo_reporting.analysis.metrics import delta
from seo_reporting.config import DEFAULT_BRAND_TERMS, ClusterConfig, Thresholds
from seo_reporting.sources.base import SearchRow


def test_normalize_umlauts_and_punctuation():
    assert normalize("Fräsdienst-Feind, E. Feind GmbH") == "fraesdienst feind e feind gmbh"


def test_brand_matcher_variants():
    m = BrandMatcher(DEFAULT_BRAND_TERMS)
    assert m.is_brand("fräsdienst feind")
    assert m.is_brand("Fraesdienst Feind Öffnungszeiten")
    assert m.is_brand("feind fräsdienst")
    assert m.is_brand("e. feind gmbh")
    assert m.is_brand("www.fraesdienst-feind.de")
    assert m.is_brand("fraesdienstfeind")
    assert not m.is_brand("cnc fräsen lassen")
    assert not m.is_brand("cnc fräsdienst nrw")


def _assigner():
    clusters = [
        ClusterConfig("CNC-Fräsen", ["cnc fräsen", "cnc frästeile"]),
        ClusterConfig("Werkstoffe", ["aluminium fräsen"]),
    ]
    return ClusterAssigner(clusters, BrandMatcher(DEFAULT_BRAND_TERMS))


def test_cluster_assignment_priority():
    a = _assigner()
    assert a.assign("fräsdienst feind cnc fräsen") == BRAND_CLUSTER  # Marke vor Cluster
    assert a.assign("CNC-Fräsen lassen") == "CNC-Fräsen"
    assert a.assign("Aluminium fräsen") == "Werkstoffe"
    assert a.assign("fräsmaschine kaufen") == OTHER_CLUSTER


def test_aggregate_weights_position_by_impressions():
    a = _assigner()
    rows = [
        SearchRow("cnc fräsen", 10, 100, 0.1, 2.0),
        SearchRow("cnc frästeile", 5, 300, 0.0167, 6.0),
    ]
    stats = aggregate(rows, a)["CNC-Fräsen"]
    assert (stats.clicks, stats.impressions, stats.query_count) == (15, 400, 2)
    assert abs(stats.position - 5.0) < 1e-9  # (2*100 + 6*300) / 400
    assert abs(stats.ctr - 15 / 400) < 1e-9


def test_delta_pct_none_when_previous_zero():
    assert delta(10, 0)["pct"] is None
    assert delta(120, 100) == {"current": 120, "previous": 100, "abs": 20, "pct": 20.0}


def test_detect_movements_thresholds():
    a = _assigner()
    th = Thresholds(cluster_click_change_pct=15, cluster_position_change=1.0, min_clicks=10)
    cur = aggregate([SearchRow("cnc fräsen", 130, 1000, 0.13, 4.0), SearchRow("aluminium fräsen", 5, 50, 0.1, 9.0)], a)
    prev = aggregate([SearchRow("cnc fräsen", 100, 1000, 0.1, 6.0), SearchRow("aluminium fräsen", 2, 50, 0.04, 12.0)], a)
    moves = detect_movements(compare(cur, prev), th, "MoM", "monthly")
    by = {(m["cluster"], m["metric"]): m for m in moves}
    assert by[("CNC-Fräsen", "clicks")]["delta_pct"] == 30.0
    assert by[("CNC-Fräsen", "clicks")]["direction"] == "up"
    assert by[("CNC-Fräsen", "position")]["direction"] == "up"  # 6 → 4 = Verbesserung
    assert ("Werkstoffe", "clicks") not in by  # unter min_clicks
    assert ("Werkstoffe", "position") not in by


def test_weekly_uses_higher_click_threshold():
    a = _assigner()
    th = Thresholds(cluster_click_change_pct=15, weekly_click_change_pct=20, min_clicks=10)
    cur = aggregate([SearchRow("cnc fräsen", 117, 1000, 0.117, 5.0)], a)
    prev = aggregate([SearchRow("cnc fräsen", 100, 1000, 0.1, 5.0)], a)
    assert detect_movements(compare(cur, prev), th, "MoM", "monthly")
    assert not detect_movements(compare(cur, prev), th, "WoW", "weekly")


def test_query_movers():
    th = Thresholds(min_clicks=5, top_n=3)
    cur = [SearchRow("a", 20, 100, 0.2, 3.0), SearchRow("b", 2, 10, 0.2, 9.0), SearchRow("new", 8, 50, 0.16, 4.0)]
    prev = [SearchRow("a", 10, 100, 0.1, 5.0), SearchRow("b", 30, 100, 0.3, 4.0), SearchRow("tiny", 1, 5, 0.2, 9.0)]
    qm = query_movers(cur, prev, th)
    assert [w["query"] for w in qm["winners"]] == ["a", "new"]
    assert [l["query"] for l in qm["losers"]] == ["b"]
