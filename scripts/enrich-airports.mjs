// Enriches the airports in the current batch by calling MiniMax-M3 API.
// Reads from .state/current-batch.json, calls the API, appends descriptions
// back to the source data file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'airport-cron-config.json'), 'utf-8'));
const BATCH_FILE = path.join(ROOT, '.state', 'current-batch.json');
const SOURCE_FILE = path.join(ROOT, 'src/_data/airports.js');

const API_KEY = process.env.MINIMAX_API_KEY || CONFIG.api.apiKey.replace('${MINIMAX_API_KEY}', '');
if (!API_KEY || API_KEY.includes('${')) {
  console.error('MINIMAX_API_KEY not set. Skipping enrichment for this cycle.');
  process.exit(0);
}

if (!fs.existsSync(BATCH_FILE)) {
  console.log('No current batch file. Run select-batch.mjs first.');
  process.exit(0);
}

const batchData = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf-8'));
const batch = batchData.batch;
console.log(`Enriching ${batch.length} airports via MiniMax-M3...`);

// Read source airports file
let sourceContent = fs.readFileSync(SOURCE_FILE, 'utf-8');

let enriched = 0;
let failed = 0;

for (let i = 0; i < batch.length; i++) {
  const ap = batch[i];
  const prompt = CONFIG.prompts.enrichment
    .replace('{{name}}', ap.name || '')
    .replace('{{iata}}', ap.iata || '')
    .replace('{{icao}}', ap.icao || '')
    .replace('{{city}}', ap.city || '')
    .replace('{{country}}', ap.country || '');

  try {
    const res = await fetch(CONFIG.api.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.model.model,
        messages: [
          { role: 'system', content: 'You are an aviation writer. Write concise, factual, helpful English descriptions of airports for travelers. No marketing language, no filler.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error(`  ${ap.iata} HTTP ${res.status}: ${(await res.text()).slice(0, 100)}`);
      failed++;
      continue;
    }

    const data = await res.json();
    const description = (data.choices?.[0]?.message?.content || '').trim();

    if (description && description.length > 50) {
      // Append description back to source — find the entry by IATA and add a `desc` field
      // We'll do a simple append-only approach: append a new property to the matching object
      // Use a regex to find the airport by IATA and add desc
      const escapedIata = ap.iata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(iata:\\s*["']?${escapedIata}["']?[^}]*?)(})`, 's');
      const replacement = description.replace(/'/g, "\\'").replace(/\n/g, ' ');
      if (regex.test(sourceContent)) {
        // Already has desc: skip; otherwise inject
        const withDesc = sourceContent.replace(regex, (match, prefix, closing) => {
          if (prefix.includes('desc:')) return match; // Already has desc
          return `${prefix},desc:'${replacement}'${closing}`;
        });
        if (withDesc !== sourceContent) {
          sourceContent = withDesc;
          enriched++;
          console.log(`  ${ap.iata} enriched (${description.length} chars)`);
        } else {
          console.log(`  ${ap.iata} already has desc, skipped`);
        }
      } else {
        console.warn(`  ${ap.iata} not found in source file`);
        failed++;
      }
    } else {
      console.log(`  ${ap.iata} empty response`);
      failed++;
    }
  } catch (e) {
    console.error(`  ${ap.iata} error: ${e.message}`);
    failed++;
  }

  // Rate limit: 1 request per second
  await new Promise(r => setTimeout(r, 1100));
}

if (enriched > 0) {
  fs.writeFileSync(SOURCE_FILE, sourceContent);
  console.log(`\n✅ Wrote ${enriched} descriptions to source file (${failed} failed)`);
} else {
  console.log(`\n⚠️  No updates made (${failed} failed). Source file unchanged.`);
}
