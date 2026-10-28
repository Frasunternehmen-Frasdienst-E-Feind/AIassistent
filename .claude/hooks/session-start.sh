#!/bin/bash
# Richtet die Umgebung für Claude Code on the web ein: Abhängigkeiten installieren
# und Caches vorwärmen, damit Tests und Linter sofort laufen.
# Mehrfach ausführbar (idempotent), ohne Rückfragen.
#
# Alle Schritte sind an eine Datei geknüpft. Dadurch passt der Hook auf jeden
# Branch dieses Repos und bleibt gültig, wenn Zweige zusammengeführt werden.
set -euo pipefail

# Nur in der Remote-Umgebung ausführen; lokale Rechner bleiben unberührt.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT"

PIP_OPTS="--quiet --disable-pip-version-check --root-user-action=ignore"

# Python-Paket samt Entwicklungswerkzeugen (pytest) installieren.
# `-e` hält die Installation an den Arbeitsbaum gebunden: Codeänderungen wirken
# sofort, ohne erneute Installation.
if [ -f pyproject.toml ]; then
  # cryptography liegt im Container als Debian-Paket (41.x) unter
  # /usr/lib/python3/dist-packages; pyproject verlangt >=42. Pip kann das
  # Debian-Paket nicht ersetzen („RECORD file not found"). Deshalb gezielt nur
  # cryptography mit --ignore-installed nach /usr/local legen – dort hat es beim
  # Import Vorrang. Ein pauschales --ignore-installed für alle Pakete würde
  # jeden Start um rund 20 s verlängern.
  if ! python3 -c "import cryptography, sys; sys.exit(int(cryptography.__version__.split('.')[0]) < 42)" >/dev/null 2>&1; then
    echo "==> pip install cryptography>=42 (ersetzt Debian-Paket)"
    pip install $PIP_OPTS --ignore-installed "cryptography>=42"
  fi

  echo "==> pip install -e .[dev]"
  # Rückfallebene, falls künftig ein weiteres Debian-Paket kollidiert.
  if ! pip install $PIP_OPTS -e ".[dev]"; then
    echo "    Erstversuch fehlgeschlagen, weiche auf --ignore-installed aus"
    pip install $PIP_OPTS --ignore-installed -e ".[dev]"
  fi
elif [ -f requirements.txt ]; then
  echo "==> pip install -r requirements.txt"
  pip install $PIP_OPTS -r requirements.txt
fi

# literary_analysis.py braucht das Anthropic-SDK; es steht in keiner
# Paketliste, daher wird es bei Bedarf einzeln nachinstalliert.
if [ -f literary_analysis.py ] && ! python3 -c "import anthropic" >/dev/null 2>&1; then
  echo "==> pip install anthropic"
  pip install $PIP_OPTS anthropic
fi

# Node (Zweig „Stempeluhr"): legt node_modules an und zieht spätere
# Abhängigkeiten automatisch nach.
if [ -f package.json ]; then
  echo "==> npm install"
  npm install --no-audit --no-fund
fi

# Go (Zweig „Stempeluhr"): keine externen Module, nur Cache vorwärmen.
# `go test -run '^$'` übersetzt alles einschließlich der Testdateien, führt aber
# nichts aus und legt – anders als `go build` – keine Binärdatei im Arbeitsbaum ab.
if [ -f zeiterfassung/go.mod ]; then
  echo "==> go test/vet (Cache vorwärmen)"
  (cd zeiterfassung && go test -run '^$' ./... >/dev/null && go vet ./...)
fi

echo "==> Setup abgeschlossen"
