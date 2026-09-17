"""Gemeinsame Datenstrukturen aller Quellen."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Protocol

from seo_reporting.periods import Period


@dataclass
class SearchRow:
    key: str  # Query, Page oder "total"
    clicks: int
    impressions: int
    ctr: float  # 0..1
    position: float

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "clicks": self.clicks,
            "impressions": self.impressions,
            "ctr": round(self.ctr, 4),
            "position": round(self.position, 2),
        }


@dataclass
class SearchData:
    totals: SearchRow
    queries: list[SearchRow] = field(default_factory=list)
    pages: list[SearchRow] = field(default_factory=list)
    last_data_date: date | None = None  # letzter Tag mit Daten (GSC-Verzögerung ~2–3 Tage)


@dataclass
class Ga4Row:
    key: str
    sessions: int
    engaged_sessions: int
    total_users: int
    key_events: float

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "sessions": self.sessions,
            "engaged_sessions": self.engaged_sessions,
            "total_users": self.total_users,
            "key_events": round(self.key_events, 2),
        }


@dataclass
class Ga4Data:
    totals: Ga4Row
    channels: list[Ga4Row] = field(default_factory=list)
    landing_pages: list[Ga4Row] = field(default_factory=list)


@dataclass
class Lead:
    created: date
    source: str
    status: str
    value: float
    won: bool


@dataclass
class CrmData:
    leads: list[Lead] = field(default_factory=list)
    available: bool = True
    note: str = ""


class DataSources(Protocol):
    def fetch_search(self, period: Period) -> SearchData: ...
    def fetch_ga4(self, period: Period) -> Ga4Data: ...
    def fetch_crm(self, period: Period) -> CrmData: ...
