# Airport Page Cron System

This system processes batches of 60 airports every 20 minutes using a cron job,
with content enrichment via the MiniMax-M3 model.

## Architecture

1. **`scripts/select-batch.mjs`** — Picks the next batch of 60 airports that need
   updates. Order: lowest score first, then oldest `lastUpdated`, then by IATA code.

2. **`scripts/enrich-airports.mjs`** — Reads the batch and calls the MiniMax-M3
   API for each airport to enrich content (description, attractions, transit
   tips, etc.). Writes the enriched data back to the source file.

3. **`scripts/trigger-build.mjs`** — Triggers a Cloudflare Pages deploy after
   the batch is processed.

4. **Cron job** — Every 20 minutes:
   - Runs `select-batch.mjs` → finds next 60 airports
   - Runs `enrich-airports.mjs` → enriches via MiniMax-M3
   - If any updates: triggers build + deploy + IndexNow ping

## First run

The first batch will be airports with the lowest scores (smallest, most
remote airports that need content most). Total: 9056 airports / 60 per
batch = 151 batches ≈ 50 hours of cron cycles for first full pass.

## Config

- Batch size: 60 (configurable in `config.json`)
- Cron interval: 20 minutes
- Model: MiniMax-M3 (provider: minimax)
- API endpoint: `https://api.minimaxi.chat/v1/text/chatcompletion_v2`

## Files

- `scripts/select-batch.mjs` — Batch selector
- `scripts/enrich-airports.mjs` — Content enrichment
- `scripts/trigger-build.mjs` — Deploy trigger
- `config.json` — Tunable parameters
