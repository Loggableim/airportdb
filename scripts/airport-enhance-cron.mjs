#!/usr/bin/env node
// Airport Page Enhancer — Cron Job
// Processes 30 airports per run via DeepSeek 4.1 Flash (ollama-cloud),
// saves enhancement data, then triggers build + deploy.
//
// Strategy: For each airport, the build template [...slug].astro reads
// `enhancements/<country>/<slug>.json` (if it exists) to inject
// AI-generated content (FAQ, local-tips, enhanced descriptions, etc).
// This cron job generates that data file for 30 airports per run.

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = 'C:/sidekick/home/spaces/airportdb';
const ENHANCEMENTS_DIR = path.join(ROOT, 'src/data/enhancements');
const STATE_FILE = path.join(ROOT, '.airport-enhance-state.json');
const PROGRESS_FILE = path.join(ROOT, '.airport-enhance-progress.json');
const BATCH_SIZE = 30;
const MODEL = 'deepseek-v4.1-flash';
const RATE_LIMIT_MS = 500; // polite to upstream

// Load .env files manually (no dotenv dep needed)
// Checks: ROOT/.env, then C:/sidekick/home/.env (where OLLAMA_API_KEY lives)
function loadEnv() {
  const env = {};
  const paths = [
    path.join(ROOT, '.env'),
    'C:/sidekick/home/.env',
  ];
  for (const envPath of paths) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
      if (!m) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    }
  }
  return env;
}
const _fileEnv = loadEnv();

// API config — ollama-cloud (OpenAI-compatible endpoint)
const API_BASE = process.env.OLLAMA_BASE_URL || _fileEnv.OLLAMA_BASE_URL || 'https://ollama.com';
const API_KEY = process.env.OLLAMA_API_KEY || _fileEnv.OLLAMA_API_KEY || '';
if (!API_KEY) {
  console.error('No API key found. Set OLLAMA_API_KEY in C:/sidekick/home/.env or environment.');
  process.exit(1);
}

function loadAirports() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/airports-light.json'), 'utf-8'));
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

const loadState = () => JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
const saveState = (s) => fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
const loadProgress = () => JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
const saveProgress = (p) => fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));

// Quick API health check before starting batch
async function testApiConnection() {
  try {
    const r = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        max_tokens: 50,
      }),
    });
    if (r.ok) return { ok: true, status: r.status };
    const text = await r.text();
    return { ok: false, status: r.status, body: text.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function makeSlug(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['']/g,'').replace(/[–—]/g,'-')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80);
}

function buildQueue() {
  const progress = loadProgress();
  // If queue has unresolved items (not all completed), keep using it
  if (progress.queue.length > 0 && progress.queue.length !== progress.completed.length) {
    return progress;
  }
  console.log('Building new queue from', loadAirports().length, 'airports...');
  const airports = loadAirports();
  // Priority: IATA-coded > large > medium > small
  const priority = (a) => {
    const hasIata = a.i && a.i.length === 3;
    const size = a.s || 0;
    return hasIata ? (size * 1000 + 1) : (size + 1);
  };
  const sorted = [...airports].sort((a, b) => priority(b) - priority(a));
  progress.queue = sorted.map(a => ({
    iata: a.i, icao: a.o, name: a.n, country: a.c, city: a.m,
    lat: a.y, lon: a.x, type: a.t, size: a.s,
  }));
  progress.completed = [];
  progress.failed = [];
  saveProgress(progress);
  return progress;
}

async function enhanceAirport(airport) {
  const prompt = `Generate rich enhancement content for this airport. Be factual, helpful, and concise. No filler text.

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
  "faqs": "3-4 Q&A pairs as a string (each Q+A on a new line, format 'Q: ...\\nA: ...\\n\\n')",
  "transport_tips": "2-3 practical sentences about getting to/from this airport",
  "local_tip": "1 unique tip a frequent visitor would appreciate"
}

All content in English. If unsure about specific facts, keep statements general.`;

  // OpenAI-compatible endpoint on ollama-cloud
  // NOTE: deepseek-v4.1-flash is a reasoning model — it needs enough max_tokens
  // for the reasoning phase before emitting the JSON content.
  // Retry with backoff on 429 (rate limit) — ollama-cloud throttles concurrent requests.
  const MAX_RETRIES = 3;
  let response;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an aviation content writer. Always respond with valid JSON, no markdown. No thinking, no  thinking tags, just the JSON output.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.4,
      }),
    });
    if (response.ok) break;
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = attempt * 5000; // 5s, 10s backoff
      process.stdout.write(`(429, retry ${attempt}/${MAX_RETRIES - 1} in ${waitMs/1000}s) `);
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err.slice(0, 200)}`);
  }
  const data = await response.json();
  const msg = data.choices?.[0]?.message || {};
  let text = msg.content || '';
  // Fallback: if content is empty but reasoning has JSON, extract from reasoning
  if (!text.trim() && msg.reasoning) {
    const m = msg.reasoning.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
  }
  // Strip  thinking tags and any markdown fences
  text = text.replace(/ thinking[\s\S]*?<\/think>/g, '').trim();
  text = text.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();

  // Try to parse JSON — if it fails, try to repair truncated string
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (firstErr) {
    let repaired = text;
    if (repaired.match(/,\s*"[^"]*"\s*:\s*"[^"]*$/)) {
      repaired = repaired + '"}';
    }
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      repaired = repaired + '}'.repeat(openBraces - closeBraces);
    }
    try {
      parsed = JSON.parse(repaired);
    } catch (secondErr) {
      console.warn(`  WARN: JSON parse failed for ${airport.iata}, using empty content`);
      parsed = { summary: '', faqs: '', transport_tips: '', local_tip: '' };
    }
  }
  return {
    summary: parsed.summary || '',
    faqs: parsed.faqs || '',
    transport_tips: parsed.transport_tips || '',
    local_tip: parsed.local_tip || '',
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };
}

// Windows-reserved device names cannot be used as filenames — prefix with "_"
const RESERVED_NAMES = ['aux', 'prn', 'con', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
function safeFileName(code) {
  return RESERVED_NAMES.includes(code) ? `_${code}` : code;
}

function saveEnhancement(airport, content) {
  const countrySlug = makeSlug(airport.country);
  const dir = path.join(ENHANCEMENTS_DIR, countrySlug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const code = safeFileName((airport.iata || airport.icao || makeSlug(airport.name)).toLowerCase());
  const file = path.join(dir, `${code}.json`);
  fs.writeFileSync(file, JSON.stringify({ airport, ...content }, null, 2));
  return file;
}

async function main() {
  initState();
  const state = loadState();
  const progress = buildQueue();

  console.log('=== Airport Enhancement Cron ===');
  console.log('Time:', new Date().toISOString());
  console.log('Model:', MODEL, '(ollama-cloud)');
  console.log('API base:', API_BASE);
  console.log('API key prefix:', API_KEY.slice(0, 8) + '...' + API_KEY.slice(-4));
  console.log('Queue size:', progress.queue.length);
  console.log('Already completed:', progress.completed.length);

  // Health check
  console.log('\n=== API Health Check ===');
  const health = await testApiConnection();
  if (health.ok) {
    console.log(`✓ API reachable (HTTP ${health.status})`);
  } else {
    console.log(`✗ API health check FAILED:`, health);
    console.log('Aborting batch. Will retry on next cron run.');
    state.lastRunAt = new Date().toISOString();
    state.lastError = health;
    saveState(state);
    process.exit(1);
  }

  // Build deduplicated "remaining" set
  // Also re-queue airports whose enhancement files are empty (repair pass)
  const doneSet = new Set(progress.completed);
  const isEmptyEnhancement = (ap) => {
    const code = safeFileName((ap.iata || ap.icao || '').toLowerCase());
    if (!code) return false;
    const file = path.join(ENHANCEMENTS_DIR, makeSlug(ap.country), `${code}.json`);
    if (!fs.existsSync(file)) return false; // missing = will be processed anyway if not in completed
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return !d.summary && !d.faqs && !d.transport_tips;
    } catch (e) {
      return true; // parse error = needs repair
    }
  };
  const needsRepair = progress.queue.filter(ap => doneSet.has(ap.iata || ap.name) && isEmptyEnhancement(ap));
  const remaining = [
    ...needsRepair,
    ...progress.queue.filter(a => !doneSet.has(a.iata || a.name)),
  ];
  const batch = remaining.slice(0, BATCH_SIZE);
  if (needsRepair.length > 0) {
    console.log(`Repair queue: ${needsRepair.length} airports with empty enhancements`);
  }

  if (batch.length === 0) {
    console.log('All airports processed — re-queueing from start.');
    progress.completed = [];
    saveProgress(progress);
    return main();
  }

  console.log('Processing batch of', batch.length, 'airports');

  let success = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < batch.length; i++) {
    const ap = batch[i];
    const code = ap.iata || ap.icao || `idx-${i}`;
    process.stdout.write(`  [${i+1}/${batch.length}] ${code} ${ap.name}... `);
    try {
      const content = await enhanceAirport(ap);
      const file = saveEnhancement(ap, content);
      const key = ap.iata || ap.name;
      if (!progress.completed.includes(key)) progress.completed.push(key);
      saveProgress(progress);
      process.stdout.write(`OK (${fs.statSync(file).size}b)\n`);
      success++;
      if (i < batch.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
    } catch (e) {
      process.stdout.write(`FAIL: ${e.message.slice(0, 80)}\n`);
      failed++;
      if (!progress.failed.find(f => f.iata === (ap.iata || ap.name))) {
        progress.failed.push({
          iata: ap.iata || ap.name, name: ap.name,
          error: e.message.slice(0, 200),
          at: new Date().toISOString(),
        });
        saveProgress(progress);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  state.lastRunAt = new Date().toISOString();
  state.lastBatchSlugs = batch.map(a => a.iata || a.icao);
  state.totalProcessed += success;
  state.totalFailed += failed;
  state.batchesRun = (state.batchesRun || 0) + 1;
  state.lastBatchDuration = elapsed + 's';
  saveState(state);

  console.log('\n=== Results ===');
  console.log('Success:', success, '| Failed:', failed, '| Time:', elapsed + 's');
  console.log('Total processed:', state.totalProcessed);
  console.log('Total batches run:', state.batchesRun);
  console.log('Remaining in queue:', progress.queue.length - progress.completed.length);

  // Trigger build only if at least 10 succeeded (avoid thrashing)
  if (success >= 10) {
    console.log('\nTriggering build + deploy (background)...');
    try {
      const child = spawn('bash', ['-c', 'bash deploy.sh >> logs/deploy.log 2>&1'], {
        cwd: ROOT,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      console.log(`✓ Deploy started in background (PID ${child.pid})`);
    } catch (deployErr) {
      console.log('⚠ Deploy spawn failed:', deployErr.message);
    }
  } else {
    console.log('Skipping deploy (success < 10)');
  }
}

main().catch(e => {
  console.error('Cron error:', e);
  process.exit(1);
});
