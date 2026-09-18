"""Deterministische Demo-Daten – für `--demo`, Tests und die Übergabe-Vorschau.

Enthält keine echten Zahlen von fraesdienst-feind.de.
"""
from __future__ import annotations

import random
from datetime import timedelta

from seo_reporting.config import Config
from seo_reporting.periods import Period
from seo_reporting.sources.base import CrmData, Ga4Data, Ga4Row, Lead, SearchData, SearchRow

_QUERIES = {
    "Marke": ["fräsdienst feind", "feind fräsdienst", "e. feind gmbh lübben", "fraesdienst-feind.de"],
    "Hauptleistungen": ["kaltfräsen", "asphaltfräsen", "betonfräsen", "straßenfräsen", "fräsarbeiten asphalt"],
    "Flächengröße": ["kleinflächenfräsen", "großflächenfräsen", "feinfräsen asphalt"],
    "Spezialverfahren": ["diamond grinding", "grooving beton", "pflasterschleifen", "nutfräsen asphalt"],
    "Service": ["fräsgut aufnehmen", "fräsarbeiten mit kehrsauger", "baustellenreinigung nach fräsen"],
    "Regional": ["asphaltfräsen brandenburg", "fräsarbeiten berlin", "betonfräsen sachsen", "kaltfräsen mecklenburg-vorpommern"],
    "Zielgruppen": ["fräsdienst für bauunternehmen", "fräsarbeiten für kommunen"],
    "Problembezogen": ["asphalt abfräsen lassen", "straßenbelag entfernen", "was kostet asphaltfräsen"],
    "Sonstige": ["fräsmaschine kaufen", "wirtgen w250 technische daten", "fräsen definition"],
}

_CHANNELS = ["Organic Search", "Direct", "Referral", "Paid Search", "Organic Social", "Email"]
_PAGES = ["/", "/kaltfraesen", "/leistungen", "/diamond-grinding-grooving", "/pflasterschleifen", "/referenzen", "/maschinenpark", "/anfrage"]
_SOURCES = ["Website-Formular", "Telefon", "E-Mail", "Ausschreibung", "Empfehlung"]


def _rng(period: Period, salt: str) -> random.Random:
    return random.Random(f"{period.start.isoformat()}-{salt}")


def _season(period: Period) -> float:
    """Leichter Aufwärtstrend + Saisonalität, damit MoM/YoY sichtbare Deltas liefern."""
    month_idx = period.start.year * 12 + period.start.month
    return 1.0 + 0.012 * (month_idx - 2024 * 12) + 0.08 * ((period.start.month % 6) / 6.0)


class DemoSources:
    def __init__(self, cfg: Config):
        self.cfg = cfg

    def fetch_search(self, period: Period) -> SearchData:
        rng = _rng(period, "gsc")
        scale = _season(period) * period.days / 30.0
        queries: list[SearchRow] = []
        for group, qs in _QUERIES.items():
            base = {"Marke": 90, "Hauptleistungen": 120, "Flächengröße": 45, "Spezialverfahren": 60,
                    "Service": 30, "Regional": 50, "Zielgruppen": 25, "Problembezogen": 40, "Sonstige": 25}[group]
            for i, q in enumerate(qs):
                impressions = int(base * scale * rng.uniform(4, 9) / (i + 1))
                position = round(rng.uniform(2.0, 14.0), 1) if group != "Marke" else round(rng.uniform(1.0, 2.5), 1)
                ctr = max(0.01, 0.35 / position)
                clicks = int(impressions * ctr * rng.uniform(0.7, 1.3))
                queries.append(SearchRow(q, clicks, impressions, clicks / impressions if impressions else 0.0, position))

        pages: list[SearchRow] = []
        for i, p in enumerate(_PAGES):
            impressions = int(1500 * scale * rng.uniform(0.6, 1.4) / (i + 1))
            clicks = int(impressions * rng.uniform(0.03, 0.09))
            pages.append(SearchRow(f"https://www.fraesdienst-feind.de{p}", clicks, impressions,
                                   clicks / impressions if impressions else 0.0, round(rng.uniform(3, 12), 1)))

        clicks = sum(q.clicks for q in queries)
        impressions = sum(q.impressions for q in queries)
        pos = sum(q.position * q.impressions for q in queries) / impressions if impressions else 0.0
        totals = SearchRow("total", clicks, impressions, clicks / impressions if impressions else 0.0, round(pos, 2))
        return SearchData(totals=totals, queries=queries, pages=pages, last_data_date=period.end - timedelta(days=2))

    def fetch_ga4(self, period: Period) -> Ga4Data:
        rng = _rng(period, "ga4")
        scale = _season(period) * period.days / 30.0
        channels: list[Ga4Row] = []
        for i, ch in enumerate(_CHANNELS):
            sessions = int(900 * scale * rng.uniform(0.7, 1.3) / (i + 1))
            channels.append(Ga4Row(ch, sessions, int(sessions * rng.uniform(0.5, 0.7)),
                                   int(sessions * rng.uniform(0.75, 0.9)), round(sessions * rng.uniform(0.01, 0.04), 1)))
        landing = [
            Ga4Row(p, int(400 * scale * rng.uniform(0.6, 1.4) / (i + 1)), 0, 0, round(rng.uniform(0, 12), 1))
            for i, p in enumerate(_PAGES)
        ]
        for row in landing:
            row.engaged_sessions = int(row.sessions * 0.6)
            row.total_users = int(row.sessions * 0.85)
        totals = Ga4Row(
            "total",
            sum(c.sessions for c in channels),
            sum(c.engaged_sessions for c in channels),
            sum(c.total_users for c in channels),
            round(sum(c.key_events for c in channels), 1),
        )
        return Ga4Data(totals=totals, channels=channels, landing_pages=landing)

    def fetch_crm(self, period: Period) -> CrmData:
        rng = _rng(period, "crm")
        n = int(12 * _season(period) * period.days / 30.0 * rng.uniform(0.7, 1.4))
        leads = []
        for _ in range(n):
            created = period.start + timedelta(days=rng.randrange(period.days))
            status = rng.choice(["neu", "angebot", "gewonnen", "verloren"])
            leads.append(Lead(created, rng.choice(_SOURCES), status, round(rng.uniform(800, 9000), 2), status == "gewonnen"))
        return CrmData(leads=leads, available=True, note=f"{n} Demo-Leads")
