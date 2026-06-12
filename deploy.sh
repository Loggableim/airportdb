#!/bin/bash
# Deploy World Airport Database to Cloudflare Pages
# Usage: bash deploy.sh
# Token is loaded from .env (not tracked by git)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Load .env if present
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

echo "=== Build ==="
npx astro build 2>&1 | grep -E "page|error|Error|✓|completed|Complete"
if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
fi

echo ""
echo "=== Deploy ==="
npx wrangler pages deploy dist/ --project-name airportdb --branch main --commit-dirty=true 2>&1 | grep -E "✨|Success|error|Error"
echo ""
echo "=== Done! ==="
curl -s -o /dev/null -w "Site: %{http_code}\n" https://world-airport-database.com/
