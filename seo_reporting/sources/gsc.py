"""Google Search Console – Search Analytics API (searchconsole v1)."""
from __future__ import annotations

from datetime import date

from seo_reporting.periods import Period
from seo_reporting.sources.base import SearchData, SearchRow

ROW_LIMIT = 25_000


class SearchConsoleSource:
    def __init__(self, site_url: str, credentials):
        from googleapiclient.discovery import build

        self.site_url = site_url
        self.service = build("searchconsole", "v1", credentials=credentials, cache_discovery=False)

    def _query(self, period: Period, dimensions: list[str], max_rows: int | None = None) -> list[dict]:
        rows: list[dict] = []
        start_row = 0
        while True:
            body = {
                "startDate": period.start.isoformat(),
                "endDate": period.end.isoformat(),
                "dimensions": dimensions,
                "rowLimit": ROW_LIMIT,
                "startRow": start_row,
                "dataState": "final",
            }
            resp = self.service.searchanalytics().query(siteUrl=self.site_url, body=body).execute()
            batch = resp.get("rows", [])
            rows.extend(batch)
            if len(batch) < ROW_LIMIT or (max_rows and len(rows) >= max_rows):
                break
            start_row += ROW_LIMIT
        return rows[:max_rows] if max_rows else rows

    @staticmethod
    def _to_row(key: str, r: dict) -> SearchRow:
        return SearchRow(
            key=key,
            clicks=int(r.get("clicks", 0)),
            impressions=int(r.get("impressions", 0)),
            ctr=float(r.get("ctr", 0.0)),
            position=float(r.get("position", 0.0)),
        )

    def fetch(self, period: Period) -> SearchData:
        total_rows = self._query(period, [])
        totals = self._to_row("total", total_rows[0]) if total_rows else SearchRow("total", 0, 0, 0.0, 0.0)

        queries = [self._to_row(r["keys"][0], r) for r in self._query(period, ["query"])]
        pages = [self._to_row(r["keys"][0], r) for r in self._query(period, ["page"])]

        date_rows = self._query(period, ["date"])
        last_date = max((date.fromisoformat(r["keys"][0]) for r in date_rows), default=None)

        return SearchData(totals=totals, queries=queries, pages=pages, last_data_date=last_date)
