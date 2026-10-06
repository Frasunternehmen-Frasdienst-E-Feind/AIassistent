#!/usr/bin/env bash
# Cloud-Setup Default-Feind – nur Tool-Installation.
# Läuft als root auf Ubuntu 24.04 vor dem Start von Claude Code.
# Anforderungen: Laufzeit < 5 min, keine API-Key-Prüfung.
# Umgebungsvariablen (z. B. CLAUDE_ENV) gehören in den Environment-Dialog,
# nicht in dieses Skript.

set -euo pipefail

echo "[setup] Starte Tool-Installation…"

apt-get update -qq
apt-get install -y --no-install-recommends \
    shellcheck \
    jq \
    curl

# Weitere Tools hier ergänzen, z. B.:
# apt-get install -y --no-install-recommends pandoc imagemagick

echo "[setup] Fertig."
