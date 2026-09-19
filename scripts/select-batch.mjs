// Selects the next batch of 60 airports that need enrichment.
// Outputs a JSON list to stdout for the agent to process.
// Order: by IATA score (smallest first → need content most), then by IATA code.

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STATE_DIR = path.join(ROOT, '.state');
const STATE_FILE = path.join(STATE_DIR, 'airport-cron-state.json');
const BATCH_FILE = path.join(STATE_DIR, 'current-batch.json');

const BATCH_SIZE = 60;

// Ensure state dir exists
if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

// Load airports
const airportsPath = pathToFileURL(path.join(ROOT, 'src/_data/airports.js')).href;
const airportsModule = await import(airportsPath);
const airports = airportsModule.default || airportsModule.airports;

// Load or init state
let state = {
  cycle: 1,
  lastProcessedIndex: -1,
  processedBatches: 0,
  enrichedCount: 0,
  lastRunAt: null,
};
if (fs.existsSync(STATE_FILE)) {
  state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) };
}

// Sort: lowest score first (smallest airports), then by IATA
const sorted = [...airports].sort((a, b) => {
  if ((a.s || 0) !== (b.s || 0)) return (a.s || 0) - (b.s || 0);
  return (a.i || '').localeCompare(b.i || '');
});

// If we've processed everything, reset for next cycle
if (state.lastProcessedIndex >= sorted.length - 1) {
  console.log(`Cycle ${state.cycle} complete. Resetting for next cycle.`);
  state.lastProcessedIndex = -1;
  state.cycle += 1;
}

const startIdx = state.lastProcessedIndex + 1;
const batch = sorted.slice(startIdx, startIdx + BATCH_SIZE);

if (batch.length === 0) {
  console.log('No more airports to process.');
  process.exit(0);
}

// Write batch
const batchData = {
  cycle: state.cycle,
  generatedAt: new Date().toISOString(),
  startIdx,
  totalToProcess: sorted.length,
  remainingAfter: sorted.length - (startIdx + batch.length),
  batch: batch.map(a => ({
    iata: a.i,
    icao: a.o,
    name: a.n,
    city: a.m,
    country: a.c,
    type: a.t,
    lat: a.y,
    lon: a.x,
    continent: a.z,
    score: a.s,
    hasDesc: !!(a.desc && a.desc.length > 50),
  })),
};

fs.writeFileSync(BATCH_FILE, JSON.stringify(batchData, null, 2));

state.lastProcessedIndex = startIdx + batch.length - 1;
state.processedBatches += 1;
state.lastRunAt = new Date().toISOString();
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

// Summary
const needsEnrichment = batchData.batch.filter(a => !a.hasDesc).length;
const alreadyHas = batch.length - needsEnrichment;

console.log(`=== Airport Batch #${state.processedBatches} (cycle ${state.cycle}) ===`);
console.log(`Range: ${startIdx}–${state.lastProcessedIndex} of ${sorted.length}`);
console.log(`Batch size: ${batch.length} airports`);
console.log(`Need enrichment: ${needsEnrichment}`);
console.log(`Already enriched: ${alreadyHas}`);
console.log(`Remaining: ${batchData.remainingAfter}`);
console.log(`\nNext 5 airports in this batch:`);
for (const a of batchData.batch.slice(0, 5)) {
  const flag = a.hasDesc ? '✓' : '·';
  console.log(`  ${flag} ${a.iata} ${a.name} (${a.country}) score=${a.score}`);
}
console.log(`\nBatch saved to: ${BATCH_FILE}`);
console.log(`State saved to: ${STATE_FILE}`);

if (needsEnrichment === 0) {
  console.log('\n⚠️  All airports in this batch already have descriptions. Skipping enrichment cycle.');
  process.exit(0);
}
