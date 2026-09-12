"""Baut die Report-Datenstruktur (JSON-fähig) aus den Quellen."""
from __future__ import annotations

from datetime import datetime, timezone

from seo_reporting import __version__
from seo_reporting.analysis.brand import BrandMatcher
from seo_reporting.analysis.clusters import (
    ClusterAssigner,
    aggregate,
    compare,
    detect_movements,
    query_movers,
)
from seo_reporting.analysis.metrics import compare_crm, compare_ga4, compare_search, crm_summary
from seo_reporting.config import Config
from seo_reporting.periods import PeriodSet
from seo_reporting.sources.base import DataSources, SearchData, SearchRow


def _brand_split(data: SearchData, brand: BrandMatcher) -> dict:
    b = SearchRow("brand", 0, 0, 0.0, 0.0)
    nb = SearchRow("non_brand", 0, 0, 0.0, 0.0)
    for row in data.queries:
        target = b if brand.is_brand(row.key) else nb
        target.clicks += row.clicks
        target.impressions += row.impressions
    for r in (b, nb):
        r.ctr = r.clicks / r.impressions if r.impressions else 0.0
    return {"brand": r_dict(b), "non_brand": r_dict(nb)}


def r_dict(row: SearchRow) -> dict:
    return {"clicks": row.clicks, "impressions": row.impressions, "ctr": round(row.ctr, 4)}


def build_report(cfg: Config, periods: PeriodSet, sources: DataSources) -> dict:
    th = cfg.thresholds
    brand = BrandMatcher(cfg.brand_terms)
    assigner = ClusterAssigner(cfg.clusters, brand)
    notes: list[str] = []
    include_yoy = periods.workflow == "monthly" or cfg.weekly_yoy

    # --- Search Console -----------------------------------------------------
    s_cur = sources.fetch_search(periods.current)
    s_prev = sources.fetch_search(periods.previous)
    s_yoy = sources.fetch_search(periods.yoy) if include_yoy else None

    if s_cur.last_data_date and s_cur.last_data_date < periods.current.end:
        notes.append(
            f"Search Console: Daten liegen nur bis {s_cur.last_data_date.isoformat()} vor "
            f"(Zeitraum endet {periods.current.end.isoformat()}). Zahlen für den Zeitraum sind ggf. unvollständig."
        )

    cl_cur = aggregate(s_cur.queries, assigner)
    cl_prev = aggregate(s_prev.queries, assigner)
    cl_cmp_prev = compare(cl_cur, cl_prev)
    movements = detect_movements(cl_cmp_prev, th, periods.previous_label, periods.workflow)

    cl_cmp_yoy = None
    if s_yoy is not None:
        cl_cmp_yoy = compare(cl_cur, aggregate(s_yoy.queries, assigner))
        movements += detect_movements(cl_cmp_yoy, th, "YoY", periods.workflow)

    gsc = {
        "totals": {
            "current": s_cur.totals.as_dict(),
            periods.previous_label: compare_search(s_cur.totals, s_prev.totals),
            "YoY": compare_search(s_cur.totals, s_yoy.totals) if s_yoy else None,
        },
        "brand_split": {
            "current": _brand_split(s_cur, brand),
            "previous": _brand_split(s_prev, brand),
            "yoy": _brand_split(s_yoy, brand) if s_yoy else None,
        },
        "clusters": {
            "current": [cl_cur[n].as_dict() for n in assigner.names],
            periods.previous_label: cl_cmp_prev,
            "YoY": cl_cmp_yoy,
        },
        "query_movers": query_movers(s_cur.queries, s_prev.queries, th),
        "top_queries": [q.as_dict() for q in sorted(s_cur.queries, key=lambda r: -r.clicks)[: th.top_n]],
        "top_pages": [p.as_dict() for p in sorted(s_cur.pages, key=lambda r: -r.clicks)[: th.top_n]],
        "last_data_date": s_cur.last_data_date.isoformat() if s_cur.last_data_date else None,
    }

    # --- GA4 ------------------------------------------------------------------
    g_cur = sources.fetch_ga4(periods.current)
    g_prev = sources.fetch_ga4(periods.previous)
    g_yoy = sources.fetch_ga4(periods.yoy) if include_yoy else None
    if g_cur.totals.sessions == 0 and not g_cur.channels:
        notes.append("GA4: keine Daten (Property-ID fehlt oder kein Zugriff).")

    prev_channels = {c.key: c for c in g_prev.channels}
    ga4 = {
        "totals": {
            "current": g_cur.totals.as_dict(),
            periods.previous_label: compare_ga4(g_cur.totals, g_prev.totals),
            "YoY": compare_ga4(g_cur.totals, g_yoy.totals) if g_yoy else None,
        },
        "channels": [
            {
                "channel": c.key,
                "current": c.as_dict(),
                periods.previous_label: compare_ga4(c, prev_channels[c.key]) if c.key in prev_channels else None,
            }
            for c in g_cur.channels
        ],
        "landing_pages": [lp.as_dict() for lp in g_cur.landing_pages[: th.top_n]],
    }

    # --- CRM ------------------------------------------------------------------
    c_cur = crm_summary(sources.fetch_crm(periods.current))
    c_prev = crm_summary(sources.fetch_crm(periods.previous))
    c_yoy = crm_summary(sources.fetch_crm(periods.yoy)) if include_yoy else None
    if not c_cur["available"]:
        notes.append(f"CRM: {c_cur['note']}")
    crm = {
        "current": c_cur,
        periods.previous_label: compare_crm(c_cur, c_prev) if c_cur["available"] and c_prev["available"] else None,
        "YoY": compare_crm(c_cur, c_yoy) if c_yoy and c_cur["available"] and c_yoy["available"] else None,
    }

    return {
        "meta": {
            "tool": f"seo_reporting {__version__}",
            "workflow": periods.workflow,
            "site": cfg.site_url,
            "ga4_property_id": cfg.ga4_property_id or None,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "periods": periods.as_dict(),
            "thresholds": cfg.thresholds.__dict__,
            "data_notes": notes,
        },
        "movements": movements,
        "gsc": gsc,
        "ga4": ga4,
        "crm": crm,
    }
