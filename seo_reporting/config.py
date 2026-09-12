"""Konfiguration: config.yaml + Umgebungsvariablen (ENV gewinnt)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml

DEFAULT_BRAND_TERMS = [
    "fräsdienst feind",
    "fraesdienst feind",
    "feind fräsdienst",
    "feind fraesdienst",
    "e. feind gmbh",
    "e feind gmbh",
    "e. feind",
    "feind gmbh",
    "fraesdienst-feind",
]


@dataclass
class ClusterConfig:
    name: str
    patterns: list[str]


@dataclass
class CrmConfig:
    export_path: str = "data/crm/leads.csv"
    date_column: str = "created_at"
    source_column: str = "source"
    status_column: str = "status"
    value_column: str = "value"
    won_statuses: list[str] = field(default_factory=lambda: ["gewonnen", "won", "auftrag"])
    date_format: str | None = None  # None = automatisch (dayfirst)


@dataclass
class Thresholds:
    cluster_click_change_pct: float = 15.0
    cluster_position_change: float = 1.0
    weekly_click_change_pct: float = 20.0
    min_clicks: int = 10
    top_n: int = 15


@dataclass
class EmailConfig:
    enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""  # nur über ENV SMTP_PASSWORD setzen
    sender: str = ""
    recipients: list[str] = field(default_factory=list)
    subject_prefix: str = "[SEO-Report fraesdienst-feind.de]"


@dataclass
class Config:
    site_url: str = "sc-domain:fraesdienst-feind.de"
    ga4_property_id: str = ""
    credentials_file: str = "credentials/service-account.json"
    brand_terms: list[str] = field(default_factory=lambda: list(DEFAULT_BRAND_TERMS))
    clusters: list[ClusterConfig] = field(default_factory=list)
    crm: CrmConfig = field(default_factory=CrmConfig)
    thresholds: Thresholds = field(default_factory=Thresholds)
    email: EmailConfig = field(default_factory=EmailConfig)
    output_dir: str = "output"
    weekly_yoy: bool = False
    timezone: str = "Europe/Berlin"


def _apply_env(cfg: Config) -> Config:
    env = os.environ
    cfg.site_url = env.get("GSC_SITE_URL", cfg.site_url)
    cfg.ga4_property_id = env.get("GA4_PROPERTY_ID", cfg.ga4_property_id)
    cfg.credentials_file = env.get("GOOGLE_APPLICATION_CREDENTIALS", cfg.credentials_file)
    cfg.crm.export_path = env.get("CRM_EXPORT_PATH", cfg.crm.export_path)
    cfg.output_dir = env.get("REPORT_OUTPUT_DIR", cfg.output_dir)
    cfg.email.smtp_host = env.get("SMTP_HOST", cfg.email.smtp_host)
    cfg.email.smtp_port = int(env.get("SMTP_PORT", cfg.email.smtp_port))
    cfg.email.smtp_user = env.get("SMTP_USER", cfg.email.smtp_user)
    cfg.email.smtp_password = env.get("SMTP_PASSWORD", cfg.email.smtp_password)
    cfg.email.sender = env.get("REPORT_EMAIL_FROM", cfg.email.sender)
    if env.get("REPORT_EMAIL_TO"):
        cfg.email.recipients = [x.strip() for x in env["REPORT_EMAIL_TO"].split(",") if x.strip()]
    return cfg


def load_config(path: str | os.PathLike | None) -> Config:
    """Lädt config.yaml (falls vorhanden) und überlagert ENV-Variablen."""
    data: dict = {}
    if path is not None and Path(path).exists():
        with open(path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}

    cfg = Config()
    cfg.site_url = data.get("site_url", cfg.site_url)
    cfg.ga4_property_id = str(data.get("ga4_property_id", cfg.ga4_property_id) or "")
    cfg.credentials_file = data.get("credentials_file", cfg.credentials_file)
    cfg.brand_terms = list(data.get("brand_terms", cfg.brand_terms))
    cfg.clusters = [
        ClusterConfig(name=str(c["name"]), patterns=[str(p) for p in c.get("patterns", [])])
        for c in data.get("clusters", [])
    ]
    cfg.crm = CrmConfig(**{**CrmConfig().__dict__, **(data.get("crm") or {})})
    cfg.thresholds = Thresholds(**{**Thresholds().__dict__, **(data.get("thresholds") or {})})
    cfg.email = EmailConfig(**{**EmailConfig().__dict__, **(data.get("email") or {})})
    cfg.output_dir = data.get("output_dir", cfg.output_dir)
    cfg.weekly_yoy = bool(data.get("weekly_yoy", cfg.weekly_yoy))
    cfg.timezone = data.get("timezone", cfg.timezone)
    return _apply_env(cfg)
