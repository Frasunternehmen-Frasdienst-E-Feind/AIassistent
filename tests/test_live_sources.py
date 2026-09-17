"""Stub-Tests für die API-Adapter (ohne Netz, ohne Google-Bibliotheken)."""
from datetime import date

from seo_reporting.periods import Period
from seo_reporting.sources.gsc import ROW_LIMIT, SearchConsoleSource

P = Period("2026-08", date(2026, 8, 1), date(2026, 8, 31))


class _Exec:
    def __init__(self, payload):
        self._payload = payload

    def execute(self):
        return self._payload


class _FakeService:
    """Simuliert searchanalytics().query(...).execute() inkl. Pagination."""

    def __init__(self):
        self.calls = []

    def searchanalytics(self):
        return self

    def query(self, siteUrl, body):
        self.calls.append(body)
        dims = body["dimensions"]
        if not dims:
            return _Exec({"rows": [{"clicks": 784, "impressions": 8913, "ctr": 0.088, "position": 7.0}]})
        if dims == ["date"]:
            return _Exec({"rows": [{"keys": ["2026-08-01"], "clicks": 1}, {"keys": ["2026-08-29"], "clicks": 2}]})
        if dims == ["page"]:
            return _Exec({"rows": [{"keys": ["https://x/"], "clicks": 5, "impressions": 50, "ctr": 0.1, "position": 3.0}]})
        # query: erste Seite voll, zweite Seite kurz → Pagination
        if body["startRow"] == 0:
            rows = [{"keys": [f"q{i}"], "clicks": 1, "impressions": 10, "ctr": 0.1, "position": 5.0} for i in range(ROW_LIMIT)]
        else:
            rows = [{"keys": ["last"], "clicks": 9, "impressions": 90, "ctr": 0.1, "position": 2.0}]
        return _Exec({"rows": rows})


def test_gsc_fetch_paginates_and_reads_last_date():
    src = SearchConsoleSource.__new__(SearchConsoleSource)
    src.site_url = "sc-domain:example.de"
    src.service = _FakeService()

    data = src.fetch(P)
    assert data.totals.clicks == 784
    assert len(data.queries) == ROW_LIMIT + 1 and data.queries[-1].key == "last"
    assert data.pages[0].key == "https://x/"
    assert data.last_data_date == date(2026, 8, 29)
    query_calls = [c for c in src.service.calls if c["dimensions"] == ["query"]]
    assert [c["startRow"] for c in query_calls] == [0, ROW_LIMIT]
    assert all(c["dataState"] == "final" for c in src.service.calls)
