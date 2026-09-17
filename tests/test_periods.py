from datetime import date

from seo_reporting.periods import last_full_week, periods_for, previous_month, shift_months


def test_previous_month_on_first_of_month():
    p = previous_month(date(2026, 9, 1))
    assert (p.label, p.start, p.end, p.days) == ("2026-08", date(2026, 8, 1), date(2026, 8, 31), 31)


def test_previous_month_january_wraps_year():
    p = previous_month(date(2026, 1, 15))
    assert (p.start, p.end) == (date(2025, 12, 1), date(2025, 12, 31))


def test_shift_months_handles_february_and_year():
    march = previous_month(date(2026, 4, 1))
    assert shift_months(march, -1).end == date(2026, 2, 28)
    assert shift_months(march, -12).label == "2025-03"


def test_last_full_week_is_monday_to_sunday():
    # 2026-09-07 ist ein Montag → letzte volle Woche 31.08.–06.09.
    p = last_full_week(date(2026, 9, 7))
    assert (p.start, p.end, p.label) == (date(2026, 8, 31), date(2026, 9, 6), "KW 36/2026")
    assert p.start.weekday() == 0 and p.end.weekday() == 6
    # Mitten in der Woche → gleiche letzte volle Woche
    assert last_full_week(date(2026, 9, 10)) == p


def test_periods_for_weekly_yoy_keeps_weekday():
    ps = periods_for("weekly", date(2026, 9, 7))
    assert ps.previous.start == date(2026, 8, 24)
    assert ps.yoy.start.weekday() == 0
    assert (ps.current.start - ps.yoy.start).days == 364
    assert ps.previous_label == "WoW"


def test_periods_for_monthly():
    ps = periods_for("monthly", date(2026, 9, 1))
    assert (ps.current.label, ps.previous.label, ps.yoy.label) == ("2026-08", "2026-07", "2025-08")
