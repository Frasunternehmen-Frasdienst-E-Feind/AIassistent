"""Google-Credentials (Service-Account) für Search Console + GA4.

Reihenfolge:
1. ENV GOOGLE_SERVICE_ACCOUNT_JSON  – kompletter JSON-Inhalt (z. B. GitHub Secret)
2. ENV GOOGLE_APPLICATION_CREDENTIALS bzw. config.credentials_file – Dateipfad
"""
from __future__ import annotations

import json
import os
from pathlib import Path

SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
]


def load_credentials(credentials_file: str | None):
    from google.oauth2 import service_account

    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if raw:
        info = json.loads(raw)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    path = credentials_file or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not path or not Path(path).exists():
        raise FileNotFoundError(
            "Keine Google-Credentials gefunden. Entweder GOOGLE_SERVICE_ACCOUNT_JSON setzen "
            f"oder Service-Account-Datei unter '{path}' ablegen (siehe docs/SETUP.md)."
        )
    return service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
