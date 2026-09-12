"""Google Analytics 4 – Data API (v1beta, runReport)."""
from __future__ import annotations

from seo_reporting.periods import Period
from seo_reporting.sources.base import Ga4Data, Ga4Row

METRICS = ["sessions", "engagedSessions", "totalUsers", "keyEvents"]


class Ga4Source:
    def __init__(self, property_id: str, credentials):
        from google.analytics.data_v1beta import BetaAnalyticsDataClient

        if not property_id:
            raise ValueError("ga4_property_id fehlt (config.yaml oder ENV GA4_PROPERTY_ID).")
        self.property = f"properties/{property_id}"
        self.client = BetaAnalyticsDataClient(credentials=credentials)

    def _run(self, period: Period, dimensions: list[str], limit: int = 10_000) -> list[Ga4Row]:
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            OrderBy,
            RunReportRequest,
        )

        request = RunReportRequest(
            property=self.property,
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in METRICS],
            date_ranges=[DateRange(start_date=period.start.isoformat(), end_date=period.end.isoformat())],
            order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
            limit=limit,
        )
        resp = self.client.run_report(request)
        rows: list[Ga4Row] = []
        for r in resp.rows:
            key = " / ".join(d.value for d in r.dimension_values) if dimensions else "total"
            vals = [m.value for m in r.metric_values]
            rows.append(
                Ga4Row(
                    key=key,
                    sessions=int(float(vals[0])),
                    engaged_sessions=int(float(vals[1])),
                    total_users=int(float(vals[2])),
                    key_events=float(vals[3]),
                )
            )
        return rows

    def fetch(self, period: Period) -> Ga4Data:
        totals_rows = self._run(period, [])
        totals = totals_rows[0] if totals_rows else Ga4Row("total", 0, 0, 0, 0.0)
        channels = self._run(period, ["sessionDefaultChannelGroup"])
        landing = self._run(period, ["landingPagePlusQueryString"], limit=100)
        return Ga4Data(totals=totals, channels=channels, landing_pages=landing)
