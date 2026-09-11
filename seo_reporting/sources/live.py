"""Bündelt die echten Quellen hinter dem DataSources-Protokoll."""
from __future__ import annotations

from seo_reporting.auth import load_credentials
from seo_reporting.config import Config
from seo_reporting.periods import Period
from seo_reporting.sources.base import CrmData, Ga4Data, SearchData
from seo_reporting.sources.crm import filter_period, load_leads
from seo_reporting.sources.ga4 import Ga4Source
from seo_reporting.sources.gsc import SearchConsoleSource


class LiveSources:
    def __init__(self, cfg: Config):
        creds = load_credentials(cfg.credentials_file)
        self.gsc = SearchConsoleSource(cfg.site_url, creds)
        self.ga4 = Ga4Source(cfg.ga4_property_id, creds) if cfg.ga4_property_id else None
        self._crm_all = load_leads(cfg.crm)

    def fetch_search(self, period: Period) -> SearchData:
        return self.gsc.fetch(period)

    def fetch_ga4(self, period: Period) -> Ga4Data:
        if self.ga4 is None:
            from seo_reporting.sources.base import Ga4Row

            return Ga4Data(totals=Ga4Row("total", 0, 0, 0, 0.0))
        return self.ga4.fetch(period)

    def fetch_crm(self, period: Period) -> CrmData:
        return filter_period(self._crm_all, period)
