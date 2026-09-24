#!/usr/bin/env sh
# Paketiert das Plugin als installierbares ZIP (ohne Build-Skript selbst).
# Aufruf aus dem Repo-Ordner: sh feind-marketing-cockpit/build-zip.sh
set -e
cd "$(dirname "$0")/.."
rm -f feind-marketing-cockpit.zip
zip -rq feind-marketing-cockpit.zip feind-marketing-cockpit -x "feind-marketing-cockpit/build-zip.sh"
ls -lh feind-marketing-cockpit.zip
