"""Versand des Reports per E-Mail (SMTP mit STARTTLS)."""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from pathlib import Path

from seo_reporting.config import EmailConfig


def send_report(cfg: EmailConfig, subject: str, body_md: str, attachments: list[Path]) -> None:
    if not cfg.smtp_host or not cfg.recipients or not cfg.sender:
        raise ValueError("E-Mail-Versand: smtp_host, sender und recipients müssen gesetzt sein.")

    msg = EmailMessage()
    msg["Subject"] = f"{cfg.subject_prefix} {subject}".strip()
    msg["From"] = cfg.sender
    msg["To"] = ", ".join(cfg.recipients)
    msg.set_content(body_md)

    for path in attachments:
        data = path.read_bytes()
        subtype = "json" if path.suffix == ".json" else "markdown"
        msg.add_attachment(data, maintype="application" if subtype == "json" else "text", subtype=subtype, filename=path.name)

    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        if cfg.smtp_user:
            smtp.login(cfg.smtp_user, cfg.smtp_password)
        smtp.send_message(msg)
