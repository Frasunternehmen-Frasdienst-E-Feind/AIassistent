"""Zeiträume für die beiden Workflows.

Workflow 1 (monatlich, 1. des Monats): Vormonat, Vergleich Vor-Vormonat (MoM)
und gleicher Monat Vorjahr (YoY).
Workflow 3 (wöchentlich, Montag): letzte volle Woche Mo–So, Vergleich Vorwoche
(WoW) und gleiche Woche Vorjahr (52 Wochen zurück, wochentagsgleich).
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Period:
    label: str
    start: date
    end: date

    @property
    def days(self) -> int:
        return (self.end - self.start).days + 1

    def as_dict(self) -> dict:
        return {
            "label": self.label,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "days": self.days,
        }


def _month_period(year: int, month: int) -> Period:
    last_day = calendar.monthrange(year, month)[1]
    return Period(f"{year}-{month:02d}", date(year, month, 1), date(year, month, last_day))


def previous_month(as_of: date) -> Period:
    """Der letzte volle Monat vor `as_of`."""
    first_of_current = as_of.replace(day=1)
    end = first_of_current - timedelta(days=1)
    return _month_period(end.year, end.month)


def shift_months(period: Period, months: int) -> Period:
    """Verschiebt einen Monats-Zeitraum um `months` Monate (negativ = zurück)."""
    idx = period.start.year * 12 + (period.start.month - 1) + months
    return _month_period(idx // 12, idx % 12 + 1)


def last_full_week(as_of: date) -> Period:
    """Letzte abgeschlossene Woche Mo–So vor der Woche, in der `as_of` liegt."""
    monday_this_week = as_of - timedelta(days=as_of.weekday())
    start = monday_this_week - timedelta(days=7)
    end = monday_this_week - timedelta(days=1)
    iso_year, iso_week, _ = start.isocalendar()
    return Period(f"KW {iso_week:02d}/{iso_year}", start, end)


def shift_days(period: Period, days: int, label: str | None = None) -> Period:
    start = period.start + timedelta(days=days)
    end = period.end + timedelta(days=days)
    if label is None:
        iso_year, iso_week, _ = start.isocalendar()
        label = f"KW {iso_week:02d}/{iso_year}"
    return Period(label, start, end)


@dataclass(frozen=True)
class PeriodSet:
    workflow: str  # "monthly" | "weekly"
    current: Period
    previous: Period  # MoM bzw. WoW
    yoy: Period
    previous_label: str  # "MoM" oder "WoW"

    def as_dict(self) -> dict:
        return {
            "workflow": self.workflow,
            "current": self.current.as_dict(),
            "previous": self.previous.as_dict(),
            "yoy": self.yoy.as_dict(),
            "previous_label": self.previous_label,
        }


def periods_for(workflow: str, as_of: date) -> PeriodSet:
    if workflow == "monthly":
        cur = previous_month(as_of)
        return PeriodSet("monthly", cur, shift_months(cur, -1), shift_months(cur, -12), "MoM")
    if workflow == "weekly":
        cur = last_full_week(as_of)
        return PeriodSet("weekly", cur, shift_days(cur, -7), shift_days(cur, -364), "WoW")
    raise ValueError(f"Unbekannter Workflow: {workflow!r} (erwartet: monthly | weekly)")
