"""Deltas (absolut und prozentual) für MoM/YoY-Vergleiche."""
from __future__ import annotations

from seo_reporting.sources.base import CrmData, Ga4Row, SearchRow


def delta(current: float, previous: float, digits: int = 1) -> dict:
    """{"current", "previous", "abs", "pct"}; pct ist None, wenn previous == 0."""
    pct = None if not previous else round((current - previous) / previous * 100.0, digits)
    return {
        "current": round(current, 4) if isinstance(current, float) else current,
        "previous": round(previous, 4) if isinstance(previous, float) else previous,
        "abs": round(current - previous, 4),
        "pct": pct,
    }


def compare_search(cur: SearchRow, prev: SearchRow) -> dict:
    return {
        "clicks": delta(cur.clicks, prev.clicks),
        "impressions": delta(cur.impressions, prev.impressions),
        "ctr": delta(cur.ctr * 100, prev.ctr * 100),
        "position": delta(cur.position, prev.position),
    }


def compare_ga4(cur: Ga4Row, prev: Ga4Row) -> dict:
    return {
        "sessions": delta(cur.sessions, prev.sessions),
        "engaged_sessions": delta(cur.engaged_sessions, prev.engaged_sessions),
        "total_users": delta(cur.total_users, prev.total_users),
        "key_events": delta(cur.key_events, prev.key_events),
    }


def crm_summary(data: CrmData) -> dict:
    if not data.available:
        return {"available": False, "note": data.note, "leads": 0, "won": 0, "value": 0.0, "by_source": []}
    by_source: dict[str, dict] = {}
    for lead in data.leads:
        entry = by_source.setdefault(lead.source or "unbekannt", {"source": lead.source or "unbekannt", "leads": 0, "won": 0, "value": 0.0})
        entry["leads"] += 1
        entry["won"] += int(lead.won)
        entry["value"] += lead.value
    rows = sorted(by_source.values(), key=lambda r: (-r["leads"], r["source"]))
    for r in rows:
        r["value"] = round(r["value"], 2)
    return {
        "available": True,
        "note": data.note,
        "leads": len(data.leads),
        "won": sum(1 for l in data.leads if l.won),
        "value": round(sum(l.value for l in data.leads), 2),
        "by_source": rows,
    }


def compare_crm(cur: dict, prev: dict) -> dict:
    return {
        "leads": delta(cur["leads"], prev["leads"]),
        "won": delta(cur["won"], prev["won"]),
        "value": delta(cur["value"], prev["value"]),
    }
