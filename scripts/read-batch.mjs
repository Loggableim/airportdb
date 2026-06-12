// Read the current batch of 60 airports and format as LLM prompt instructions.
// Outputs a numbered list of airports with all context needed for description generation.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BATCH_FILE = path.join(ROOT, '.state', 'current-batch.json');
const STATE_FILE = path.join(ROOT, '.state', 'airport-cron-state.json');

if (!fs.existsSync(BATCH_FILE)) {
  console.error('No current batch. Run select-batch.mjs first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf-8'));
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

// Output the 60 airports as a structured list
console.log(JSON.stringify({
  cycle: data.cycle,
  batchNumber: state.processedBatches,
  totalAirportsInBatch: data.batch.length,
  range: `${data.startIdx}–${data.startIdx + data.batch.length - 1}`,
  remaining: data.remainingAfter,
  airports: data.batch.map((a, i) => ({
    seq: i + 1,
    iata: a.iata,
    icao: a.icao,
    name: a.name,
    city: a.city,
    country: a.country,
    type: a.type,
    continent: a.continent,
  })),
}, null, 2));
