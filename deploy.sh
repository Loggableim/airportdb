#!/bin/bash
# Deploy World Airport Database to Cloudflare Pages
# Usage: bash deploy.sh
# Token is loaded from C:/sidekick/home/.env (fallback: local .env)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Extract only needed vars (avoids sourcing errors from malformed .env lines)
if [ -f ".env" ]; then
  export CLOUDFLARE_API_TOKEN=$(grep -m1 '^CLOUDFLARE_API_TOKEN=' .env | cut -d= -f2-)
  export CLOUDFLARE_ACCOUNT_ID=$(grep -m1 '^CLOUDFLARE_ACCOUNT_ID=' .env | cut -d= -f2-)
elif [ -f "/c/sidekick/home/.env" ]; then
  export CLOUDFLARE_API_TOKEN=$(grep -m1 '^CLOUDFLARE_API_TOKEN=' /c/sidekick/home/.env | cut -d= -f2-)
  export CLOUDFLARE_ACCOUNT_ID=$(grep -m1 '^CLOUDFLARE_ACCOUNT_ID=' /c/sidekick/home/.env | cut -d= -f2-)
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN not found"
  exit 1
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
