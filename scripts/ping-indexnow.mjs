// IndexNow ping script
// Usage: node scripts/ping-indexnow.mjs [urls...]
//        node scripts/ping-indexnow.mjs --sitemap
//
// Posts URLs to IndexNow (Bing, Yandex, Seznam, Naver) for instant indexing.
// API key: a28f2699c1dd4b92bf5de35fa41cc70b

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const KEY = 'a28f2699c1dd4b92bf5de35fa41cc70b';
const HOST = 'world-airport-database.com';
const KEY_LOCATION = `https://${HOST}/indexnow-key.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_PATH = path.join(ROOT, 'dist', 'sitemap-0.xml');

const MAX_PER_REQUEST = 10000;

async function loadUrlsFromSitemap() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error('Sitemap not found:', SITEMAP_PATH);
    process.exit(1);
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return urls;
}

async function loadUrlsFromArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--sitemap')) {
    return await loadUrlsFromSitemap();
  }
  return args.filter(u => u.startsWith('http'));
}

async function pingIndexNow(urls) {
  if (!urls.length) {
    console.log('No URLs to submit.');
    return;
  }
  console.log(`Submitting ${urls.length} URLs to IndexNow...`);

  // IndexNow accepts up to 10,000 URLs per request
  const batches = [];
  for (let i = 0; i < urls.length; i += MAX_PER_REQUEST) {
    batches.push(urls.slice(i, i + MAX_PER_REQUEST));
  }

  let totalOk = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
      const body = {
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: batch,
      };
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const ok = res.status === 200;
      console.log(`  Batch ${i + 1}/${batches.length} (${batch.length} URLs): HTTP ${res.status} ${ok ? 'OK' : 'FAIL'}`);
      if (!ok) {
        console.log(`    Response: ${text.slice(0, 200)}`);
      } else {
        totalOk += batch.length;
      }
    } catch (e) {
      console.error(`  Batch ${i + 1} error:`, e.message);
    }
  }
  console.log(`\n✅ Submitted ${totalOk}/${urls.length} URLs`);
}

const urls = await loadUrlsFromArgs();
if (urls.length) {
  await pingIndexNow(urls);
} else {
  console.log('Usage:');
  console.log('  node scripts/ping-indexnow.mjs --sitemap                # Submit all URLs from sitemap');
  console.log('  node scripts/ping-indexnow.mjs https://example.com/a/    # Submit specific URLs');
  process.exit(1);
}
