"""Keyword-Cluster: Zuordnung, Aggregation, Vergleich und Bewegungs-Erkennung."""
from __future__ import annotations

from dataclasses import dataclass, field

from seo_reporting.analysis.brand import BrandMatcher, normalize
from seo_reporting.analysis.metrics import delta
from seo_reporting.config import ClusterConfig, Thresholds
from seo_reporting.sources.base import SearchRow

BRAND_CLUSTER = "Marke (Fräsdienst Feind)"
OTHER_CLUSTER = "Sonstige (nicht zugeordnet)"


class ClusterAssigner:
    def __init__(self, clusters: list[ClusterConfig], brand: BrandMatcher):
        self.brand = brand
        self.clusters = [(c.name, [normalize(p) for p in c.patterns if p.strip()]) for c in clusters]

    def assign(self, query: str) -> str:
        if self.brand.is_brand(query):
            return BRAND_CLUSTER
        q = normalize(query)
        for name, patterns in self.clusters:
            if any(p in q for p in patterns):
                return name
        return OTHER_CLUSTER

    @property
    def names(self) -> list[str]:
        return [BRAND_CLUSTER] + [n for n, _ in self.clusters] + [OTHER_CLUSTER]


@dataclass
class ClusterStats:
    name: str
    clicks: int = 0
    impressions: int = 0
    _pos_weighted: float = 0.0
    query_count: int = 0
    top_queries: list[SearchRow] = field(default_factory=list)

    @property
    def position(self) -> float:
        return self._pos_weighted / self.impressions if self.impressions else 0.0

    @property
    def ctr(self) -> float:
        return self.clicks / self.impressions if self.impressions else 0.0

    def as_dict(self, top_n: int = 5) -> dict:
        return {
            "name": self.name,
            "clicks": self.clicks,
            "impressions": self.impressions,
            "ctr": round(self.ctr, 4),
            "position": round(self.position, 2),
            "query_count": self.query_count,
            "top_queries": [q.as_dict() for q in sorted(self.top_queries, key=lambda r: -r.clicks)[:top_n]],
        }


def aggregate(rows: list[SearchRow], assigner: ClusterAssigner) -> dict[str, ClusterStats]:
    stats = {name: ClusterStats(name) for name in assigner.names}
    for row in rows:
        s = stats[assigner.assign(row.key)]
        s.clicks += row.clicks
        s.impressions += row.impressions
        s._pos_weighted += row.position * row.impressions
        s.query_count += 1
        s.top_queries.append(row)
    return stats


def compare(current: dict[str, ClusterStats], previous: dict[str, ClusterStats]) -> list[dict]:
    out = []
    for name, cur in current.items():
        prev = previous.get(name, ClusterStats(name))
        out.append(
            {
                "name": name,
                "clicks": delta(cur.clicks, prev.clicks),
                "impressions": delta(cur.impressions, prev.impressions),
                "ctr": delta(cur.ctr * 100, prev.ctr * 100),
                "position": delta(cur.position, prev.position, digits=2),
                "query_count": delta(cur.query_count, prev.query_count),
            }
        )
    return sorted(out, key=lambda c: -c["clicks"]["current"])


def detect_movements(comparisons: list[dict], th: Thresholds, basis: str, workflow: str) -> list[dict]:
    """Markiert Cluster mit auffälliger Klick- oder Positionsbewegung.

    basis: "MoM" | "WoW" | "YoY"; workflow steuert die Klick-Schwelle (Woche ist volatiler).
    """
    click_threshold = th.weekly_click_change_pct if workflow == "weekly" else th.cluster_click_change_pct
    movements: list[dict] = []
    for c in comparisons:
        clicks_now, clicks_prev = c["clicks"]["current"], c["clicks"]["previous"]
        if max(clicks_now, clicks_prev) < th.min_clicks:
            continue
        pct = c["clicks"]["pct"]
        pos_abs = c["position"]["abs"]

        if pct is not None and abs(pct) >= click_threshold:
            severity = "hoch" if abs(pct) >= 2 * click_threshold and max(clicks_now, clicks_prev) >= 3 * th.min_clicks else "mittel"
            movements.append(
                {
                    "cluster": c["name"],
                    "basis": basis,
                    "metric": "clicks",
                    "direction": "up" if pct > 0 else "down",
                    "current": clicks_now,
                    "previous": clicks_prev,
                    "delta_pct": pct,
                    "severity": severity,
                }
            )
        elif pct is None and clicks_now >= th.min_clicks:
            movements.append(
                {
                    "cluster": c["name"],
                    "basis": basis,
                    "metric": "clicks",
                    "direction": "up",
                    "current": clicks_now,
                    "previous": 0,
                    "delta_pct": None,
                    "severity": "mittel",
                }
            )

        # Position: kleiner = besser. Verbesserung = negative Differenz.
        if c["position"]["previous"] and abs(pos_abs) >= th.cluster_position_change:
            movements.append(
                {
                    "cluster": c["name"],
                    "basis": basis,
                    "metric": "position",
                    "direction": "up" if pos_abs < 0 else "down",
                    "current": c["position"]["current"],
                    "previous": c["position"]["previous"],
                    "delta_pct": None,
                    "delta_abs": round(pos_abs, 2),
                    "severity": "hoch" if abs(pos_abs) >= 2 * th.cluster_position_change else "mittel",
                }
            )

    order = {"hoch": 0, "mittel": 1}
    return sorted(movements, key=lambda m: (order[m["severity"]], -abs(m["delta_pct"] or m.get("delta_abs") or 0)))


def query_movers(current: list[SearchRow], previous: list[SearchRow], th: Thresholds) -> dict:
    """Top-Gewinner/-Verlierer auf Query-Ebene (Klicks), gefiltert über min_clicks."""
    prev_map = {r.key: r for r in previous}
    cur_map = {r.key: r for r in current}
    changes = []
    for key in set(prev_map) | set(cur_map):
        c = cur_map.get(key)
        p = prev_map.get(key)
        cc, pc = (c.clicks if c else 0), (p.clicks if p else 0)
        if max(cc, pc) < th.min_clicks:
            continue
        changes.append(
            {
                "query": key,
                "clicks": delta(cc, pc),
                "position": delta(c.position if c else 0.0, p.position if p else 0.0, digits=2),
            }
        )
    winners = sorted((x for x in changes if x["clicks"]["abs"] > 0), key=lambda x: -x["clicks"]["abs"])[: th.top_n]
    losers = sorted((x for x in changes if x["clicks"]["abs"] < 0), key=lambda x: x["clicks"]["abs"])[: th.top_n]
    return {"winners": winners, "losers": losers}
