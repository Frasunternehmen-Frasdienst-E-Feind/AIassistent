"""CRM-Export (CSV oder XLSX) – Leads pro Zeitraum.

Datenschutz: Der Export braucht nur Datum, Quelle, Status, Wert.
Keine Namen/E-Mails/Telefonnummern in das Repo oder den Report übernehmen.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from seo_reporting.config import CrmConfig
from seo_reporting.periods import Period
from seo_reporting.sources.base import CrmData, Lead


def _read_export(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in {".xlsx", ".xlsm", ".xls"}:
        return pd.read_excel(path)
    return pd.read_csv(path, sep=None, engine="python", encoding="utf-8-sig")


def load_leads(cfg: CrmConfig) -> CrmData:
    path = Path(cfg.export_path)
    if not path.exists():
        return CrmData(available=False, note=f"CRM-Export nicht gefunden: {path}")

    df = _read_export(path)
    missing = [c for c in (cfg.date_column, cfg.source_column, cfg.status_column) if c not in df.columns]
    if missing:
        return CrmData(available=False, note=f"Spalten fehlen im CRM-Export: {', '.join(missing)}")

    if cfg.date_format:
        dates = pd.to_datetime(df[cfg.date_column], format=cfg.date_format, errors="coerce")
    else:
        dates = pd.to_datetime(df[cfg.date_column], dayfirst=True, errors="coerce")

    values = (
        pd.to_numeric(df[cfg.value_column], errors="coerce").fillna(0.0)
        if cfg.value_column in df.columns
        else pd.Series([0.0] * len(df))
    )
    won_set = {s.strip().lower() for s in cfg.won_statuses}

    leads: list[Lead] = []
    for created, source, status, value in zip(dates, df[cfg.source_column], df[cfg.status_column], values):
        if pd.isna(created):
            continue
        status_s = "" if pd.isna(status) else str(status).strip()
        leads.append(
            Lead(
                created=created.date(),
                source="" if pd.isna(source) else str(source).strip() or "unbekannt",
                status=status_s,
                value=float(value),
                won=status_s.lower() in won_set,
            )
        )
    return CrmData(leads=leads, available=True, note=f"{len(leads)} Leads aus {path.name}")


def filter_period(data: CrmData, period: Period) -> CrmData:
    if not data.available:
        return data
    subset = [l for l in data.leads if period.start <= l.created <= period.end]
    return CrmData(leads=subset, available=True, note=data.note)
