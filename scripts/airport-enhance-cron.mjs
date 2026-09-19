#!/usr/bin/env node
// Airport Page Enhancer — Cron Job
// Enhances 60 airport pages per run via minimax-3 AI
//
// Strategy: For each airport, the build template [...slug].astro reads
// `enhancements/<country>/<slug>.json` (if it exists) to inject
// AI-generated content (FAQ, local-tips, enhanced descriptions, etc).
// This cron job generates that data file for 60 airports per run,
// then triggers a build+deploy.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = 'C:/HermesPortable/home/spaces/airportdb';
const AIRPORTS_DATA = path.join(ROOT, 'src/_data/airports.js');
const ENHANCEMENTS_DIR = path.join(ROOT, 'src/data/enhancements');
const STATE_FILE = path.join(ROOT, '.airport-enhance-state.json');
const PROGRESS_FILE = path.join(ROOT, '.airport-enhance-progress.json');
const BATCH_SIZE = 60;

// minimax-3 API config — uses default provider config (pinned at job creation)
const MODEL = 'minimax-3';

// Load airports data (slim, just code+name+country)
function loadAirports() {
  // Use airports-light.json for fast loading
  const lite = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/airports-light.json'), 'utf-8'));
  return lite;
}

function initState() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      lastRunAt: null,
      totalProcessed: 0,
      totalFailed: 0,
      batchesRun: 0,
      lastBatchSlugs: [],
    }, null, 2));
  }
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      queue: [],
      completed: [],
      failed: [],
    }, null, 2));
  }
  if (!fs.existsSync(ENHANCEMENTS_DIR)) {
    fs.mkdirSync(ENHANCEMENTS_DIR, { recursive: true });
  }
}

function loadState() { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }
function loadProgress() { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); }
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

// Build queue: priority order = IATA-coded large airports first
function buildQueue() {
  const progress = loadProgress();
  if (progress.queue.length > 0 && progress.queue.length !== progress.completed.length) {
    return progress;
  }
  console.log('Building queue from all airports...');
  const airports = loadAirports();
  // Sort: large with IATA > medium with IATA > small with IATA > rest
  const priority = (a) => {
    const hasIata = a.i && a.i.length === 3;
    const size = a.s || 0;
    return hasIata ? (size * 1000 + 1) : (size + 1);
  };
  const sorted = [...airports].sort((a, b) => priority(b) - priority(a));
  progress.queue = sorted.map(a => ({
    iata: a.i,
    icao: a.o,
    name: a.n,
    country: a.c,
    city: a.m,
    lat: a.y,
    lon: a.x,
    type: a.t,
    size: a.s,
  }));
  saveProgress(progress);
  return progress;
}

// Slug for a country and airport name
function makeSlug(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['']/g,'').replace(/[–—]/g,'-')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80);
}

// Call minimax-3 to generate enhancement content for one airport
async function enhanceAirport(airport) {
  const prompt = `Generate rich enhancement content for this airport in JSON format. Be factual, helpful, and concise. No filler text.

Airport:
- Name: ${airport.name}
- IATA: ${airport.iata || 'N/A'}
- ICAO: ${airport.icao || 'N/A'}
- City: ${airport.city || 'unknown'}
- Country: ${airport.country}
- Type: ${airport.type || 'unknown'}
- Size score: ${airport.size || 0}
- Coordinates: ${airport.lat?.toFixed(3)}, ${airport.lon?.toFixed(3)}

Return ONLY a valid JSON object with these keys (all strings, no markdown fences):
{
  "summary": "2-3 sentence unique description of the airport (history, location, unique features)",
  "faqs": "5 Q&A pairs as a string (each Q+A on a new line, format 'Q: ...\\nA: ...\\n\\n')",
  "nearby_amenities": "3-4 bullet points as a string (each '- amenity' on new line)",
  "transport_tips": "2-3 practical sentences about getting to/from this airport",
  "local_tip": "1 unique tip a frequent visitor would appreciate"
}

All content in English. If unsure about specific facts, keep statements general (e.g., "serves the metropolitan area") rather than inventing.`;

  try {
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an aviation content writer. Always respond with valid JSON, no markdown.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API ${response.status}: ${err.slice(0, 200)}`);
    }
    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    // Strip code fences if present
    text = text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary || '',
      faqs: parsed.faqs || '',
      nearby_amenities: parsed.nearby_amenities || '',
      transport_tips: parsed.transport_tips || '',
      local_tip: parsed.local_tip || '',
      generatedAt: new Date().toISOString(),
      model: MODEL,
    };
  } catch (e) {
    throw new Error(`AI enhancement failed: ${e.message}`);
  }
}

// Save enhancement to disk
function saveEnhancement(airport, content) {
  const countrySlug = makeSlug(airport.country);
  const dir = path.join(ENHANCEMENTS_DIR, countrySlug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Use IATA code as filename for unique lookup
  const code = airport.iata || airport.icao || makeSlug(airport.name);
  const file = path.join(dir, `${code.toLowerCase()}.json`);
  fs.writeFileSync(file, JSON.stringify({ airport, ...content }, null, 2));
  return file;
}

async function main() {
  initState();
  const state = loadState();
  const progress = buildQueue();

  console.log('=== Airport Enhancement Cron Run ===');
  console.log('Time:', new Date().toISOString());
  console.log('Model:', MODEL);
  console.log('Queue:', progress.queue.length, '| Completed:', progress.completed.length, '| Failed:', progress.failed.length);

  // Next batch: skip already completed
  const remaining = progress.queue.filter(a => !progress.completed.includes(a.iata || a.name));
  const batch = remaining.slice(0, BATCH_SIZE);

  if (batch.length === 0) {
    console.log('All airports processed! Nothing to do.');
    return;
  }

  console.log('Processing batch of', batch.length, 'airports');

  let success = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < batch.length; i++) {
    const ap = batch[i];
    const code = ap.iata || ap.icao || `idx-${i}`;
    process.stdout.write(`  [${i+1}/${batch.length}] ${code} ${ap.name}... `);
    try {
      const content = await enhanceAirport(ap);
      const file = saveEnhancement(ap, content);
      progress.completed.push(ap.iata || ap.name);
      saveProgress(progress);
      process.stdout.write(`OK (${fs.statSync(file).size}b)\n`);
      success++;
      // Rate-limit: ~3 req/s to be polite
      if (i < batch.length - 1) await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      process.stdout.write(`FAIL: ${e.message.slice(0, 60)}\n`);
      failed++;
      failures.push({ airport: ap, error: e.message });
      if (!progress.failed.find(f => f.iata === (ap.iata || ap.name))) {
        progress.failed.push({ iata: ap.iata || ap.name, name: ap.name, error: e.message, at: new Date().toISOString() });
        saveProgress(progress);
      }
    }
  }

  // Update state
  state.lastRunAt = new Date().toISOString();
  state.lastBatchSlugs = batch.map(a => a.iata || a.icao);
  state.totalProcessed += success;
  state.totalFailed += failed;
  state.batchesRun += 1;
  saveState(state);

  console.log('\n=== Batch Results ===');
  console.log('Success:', success);
  console.log('Failed:', failed);
  console.log('Total processed:', state.totalProcessed);
  console.log('Remaining:', progress.queue.length - progress.completed.length);

  if (failed > 0) {
    console.log('\nFailures:');
    failures.slice(0, 5).forEach(f => {
      console.log(`  - ${f.airport.iata} ${f.airport.name}: ${f.error.slice(0, 80)}`);
    });
  }

  // Trigger build + deploy if at least 10 succeeded (avoid thrashing on small/failed batches)
  if (success >= 10) {
    console.log('\nTriggering build + deploy...');
    try {
      execSync('bash deploy.sh 2>&1 | tail -8', {
        cwd: ROOT,
        stdio: 'inherit',
        shell: 'C:/Program Files/Git/bin/bash.exe',
      });
    } catch (e) {
      console.log('Deploy error:', e.message);
    }
  } else {
    console.log('Skipping deploy (not enough successes this batch)');
  }
}

main().catch(e => {
  console.error('Cron error:', e);
  process.exit(1);
});
