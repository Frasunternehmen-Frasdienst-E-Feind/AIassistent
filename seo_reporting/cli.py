"""Kommandozeile.

  python -m seo_reporting monthly [--as-of YYYY-MM-DD] [--demo] [--email]
  python -m seo_reporting weekly  [--as-of YYYY-MM-DD] [--demo] [--email]
  python -m seo_reporting check-auth
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from seo_reporting.config import Config, load_config
from seo_reporting.periods import periods_for
from seo_reporting.report.build import build_report
from seo_reporting.report.markdown import render


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="seo_reporting", description="SEO-/Lead-Reporting fraesdienst-feind.de")
    p.add_argument("--config", default=None, help="Pfad zur config.yaml (Standard: ./config.yaml, sonst config.example.yaml)")
    sub = p.add_subparsers(dest="command", required=True)

    for name, help_text in (("monthly", "Workflow 1: Monatsreport (Vormonat, MoM + YoY)"),
                            ("weekly", "Workflow 3: Wochen-Check (letzte volle Woche, WoW)")):
        sp = sub.add_parser(name, help=help_text)
        sp.add_argument("--as-of", default=None, help="Stichtag YYYY-MM-DD (Standard: heute)")
        sp.add_argument("--demo", action="store_true", help="Synthetische Daten statt echter APIs")
        sp.add_argument("--email", action="store_true", help="Report per E-Mail senden (SMTP-Konfiguration nötig)")
        sp.add_argument("--stdout", action="store_true", help="Markdown zusätzlich auf stdout ausgeben")

    sub.add_parser("check-auth", help="Prüft Credentials und Zugriff auf Search Console + GA4")
    return p


def _resolve_config_path(arg: str | None) -> str | None:
    if arg:
        return arg
    for candidate in ("config.yaml", "config.example.yaml"):
        if Path(candidate).exists():
            if candidate.endswith("example.yaml"):
                print("Hinweis: config.yaml fehlt, verwende config.example.yaml.", file=sys.stderr)
            return candidate
    return None


def _sources(cfg: Config, demo: bool):
    if demo:
        from seo_reporting.sources.demo import DemoSources

        return DemoSources(cfg)
    from seo_reporting.sources.live import LiveSources

    return LiveSources(cfg)


def run_report(cfg: Config, workflow: str, as_of: date, demo: bool, send_email: bool, to_stdout: bool) -> Path:
    periods = periods_for(workflow, as_of)
    report = build_report(cfg, periods, _sources(cfg, demo))
    md = render(report)

    out_dir = Path(cfg.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{workflow}_{periods.current.start.isoformat()}_{periods.current.end.isoformat()}" + ("_demo" if demo else "")
    md_path = out_dir / f"{stem}.md"
    json_path = out_dir / f"{stem}.json"
    md_path.write_text(md, encoding="utf-8")
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Report geschrieben: {md_path} und {json_path}", file=sys.stderr)

    if to_stdout:
        print(md)

    if send_email:
        from seo_reporting.report.email import send_report

        subject = f"{'Monatsreport' if workflow == 'monthly' else 'Wochen-Check'} {periods.current.label}"
        send_report(cfg.email, subject, md, [md_path, json_path])
        print(f"E-Mail gesendet an: {', '.join(cfg.email.recipients)}", file=sys.stderr)
    return md_path


def check_auth(cfg: Config) -> int:
    from datetime import timedelta

    from seo_reporting.auth import load_credentials
    from seo_reporting.periods import Period
    from seo_reporting.sources.ga4 import Ga4Source
    from seo_reporting.sources.gsc import SearchConsoleSource

    creds = load_credentials(cfg.credentials_file)
    print(f"Credentials OK: {getattr(creds, 'service_account_email', '?')}")
    probe = Period("probe", date.today() - timedelta(days=10), date.today() - timedelta(days=4))

    sites = SearchConsoleSource(cfg.site_url, creds).service.sites().list().execute().get("siteEntry", [])
    urls = [s["siteUrl"] for s in sites]
    print(f"Search Console Properties: {urls or 'keine (Service-Account als Nutzer hinzufügen!)'}")
    if cfg.site_url not in urls:
        print(f"WARNUNG: '{cfg.site_url}' nicht darunter.")
    else:
        rows = SearchConsoleSource(cfg.site_url, creds)._query(probe, [])
        print(f"Search Console Testabfrage: {rows[0] if rows else 'keine Zeilen'}")

    if cfg.ga4_property_id:
        totals = Ga4Source(cfg.ga4_property_id, creds).fetch(probe).totals
        print(f"GA4 Property {cfg.ga4_property_id}: {totals.sessions} Sitzungen in Testwoche")
    else:
        print("GA4: keine Property-ID konfiguriert (übersprungen).")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    cfg = load_config(_resolve_config_path(args.config))

    if args.command == "check-auth":
        return check_auth(cfg)

    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    run_report(cfg, args.command, as_of, args.demo, args.email, args.stdout)
    return 0
