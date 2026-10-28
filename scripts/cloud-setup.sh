#!/usr/bin/env bash
# Cloud-Setup Default-Feind – nur Tool-Installation.
# Läuft als root auf Ubuntu 24.04 vor dem Start von Claude Code.
# Anforderungen: Laufzeit < 5 min, keine API-Key-Prüfung.
# Umgebungsvariablen (z. B. CLAUDE_ENV) gehören in den Environment-Dialog,
# nicht in dieses Skript.

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "[setup] Starte Tool-Installation…"

apt-get -o Acquire::Retries=3 update -qq
apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    shellcheck \
    jq \
    curl \
    pandoc \
    imagemagick

# Weitere Tools hier ergänzen: Paketliste oben erweitern, Laufzeit < 5 min beachten.

echo "[setup] Fertig."
