#!/usr/bin/env sh
# Paketiert das Plugin als installierbares ZIP. Baut dafür den MCP-Server feind-vergabe in einer
# Arbeitskopie (dist/ und Laufzeit-Abhängigkeiten), weil beides nicht versioniert ist.
# Aufruf aus dem Repo-Ordner: sh feind-marketing-cockpit/build-zip.sh   (braucht node >= 18, npm, zip)
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R feind-marketing-cockpit "$STAGE/"
rm -rf "$STAGE/feind-marketing-cockpit/mcp/feind-vergabe/node_modules" "$STAGE/feind-marketing-cockpit/mcp/feind-vergabe/dist"
(
  cd "$STAGE/feind-marketing-cockpit/mcp/feind-vergabe"
  npm ci --no-audit --no-fund --loglevel=error
  npm run build --silent
  npm prune --omit=dev --no-audit --no-fund --loglevel=error
  rm -rf dist/test
)
test -f "$STAGE/feind-marketing-cockpit/mcp/feind-vergabe/dist/src/index.js"
rm -f "$ROOT/feind-marketing-cockpit.zip"
cd "$STAGE"
zip -rq "$ROOT/feind-marketing-cockpit.zip" feind-marketing-cockpit \
  -x "feind-marketing-cockpit/build-zip.sh" "feind-marketing-cockpit/dashboard/test/*" \
     "feind-marketing-cockpit/mcp/feind-vergabe/test/*"
ls -lh "$ROOT/feind-marketing-cockpit.zip"
