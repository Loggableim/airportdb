/**
 * Post-build script: generates thematically organized sitemaps.
 *
 * Scans dist/ for built HTML files, groups them by type,
 * and writes separate sitemap XML files + a sitemap-index.xml.
 *
 * Run after `astro build`.
 */

import { readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, sep, dirname } from 'path';
import { fileURLToPath } from 'url';

const SITE = 'https://world-airport-database.com';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const ENTRY_LIMIT = 2500;

// ── Scan dist for HTML files ──────────────────────────────────────
function scanPages(dir) {
  const pages = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...scanPages(full));
    } else if (entry.name === 'index.html') {
      // Convert filesystem path to URL path
      let urlPath = relative(DIST, full)
        .replace(/\\/g, '/')
        .replace(/\/index\.html$/, '/');
      if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
      pages.push(urlPath);
    }
  }
  return pages;
}

// ── Categorize ────────────────────────────────────────────────────
function categorize(path) {
  if (path.startsWith('/airports/')) return 'airports';
  if (path.startsWith('/countries/')) return 'countries';
  if (path.startsWith('/blog/')) return 'blog';
  if (path.startsWith('/tools/')) return 'tools';
  return 'main';
}

// ── Generate sitemap XML for a list of URLs ───────────────────────
function buildSitemapXml(urls) {
  const entries = urls.map(u => `  <url>
    <loc>${SITE}${u}</loc>
    <changefreq>${getChangefreq(u)}</changefreq>
    <priority>${getPriority(u)}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function getChangefreq(path) {
  if (path.startsWith('/airports/') || path.startsWith('/countries/')) return 'weekly';
  if (path.startsWith('/blog/') || path.startsWith('/tools/')) return 'monthly';
  return 'daily';
}

function getPriority(path) {
  if (path === '/') return '1.0';
  if (path.startsWith('/airports/')) return '0.8';
  if (path.startsWith('/countries/')) return '0.7';
  if (path.startsWith('/blog/')) return '0.6';
  if (path.startsWith('/tools/')) return '0.6';
  return '0.5';
}

// ── Main ───────────────────────────────────────────────────────────
const allPages = scanPages(DIST);
console.log(`Found ${allPages.length} pages in dist/`);

// Group
const groups = { airports: [], countries: [], blog: [], tools: [], main: [] };
for (const p of allPages) {
  groups[categorize(p)].push(p);
}

console.log('Groups:');
for (const [key, urls] of Object.entries(groups)) {
  console.log(`  ${key}: ${urls.length}`);
}

// Write sitemap files
const sitemapIndexEntries = [];
let fileIndex = 0;

for (const [category, urls] of Object.entries(groups)) {
  if (urls.length === 0) continue;

  // Split large groups into chunks
  const chunks = [];
  for (let i = 0; i < urls.length; i += ENTRY_LIMIT) {
    chunks.push(urls.slice(i, i + ENTRY_LIMIT));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const suffix = chunks.length > 1 ? `${category}-${ci}` : category;
    const filename = `sitemap-${suffix}.xml`;
    const xml = buildSitemapXml(chunks[ci]);
    writeFileSync(join(DIST, filename), xml, 'utf-8');
    sitemapIndexEntries.push(filename);
    console.log(`  ✓ ${filename} (${chunks[ci].length} URLs)`);
    fileIndex++;
  }
}

// Write sitemap-index.xml
const now = new Date().toISOString();
const indexEntries = sitemapIndexEntries.map(f =>
  `  <sitemap>
    <loc>${SITE}/${f}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
).join('\n');

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries}
</sitemapindex>`;

writeFileSync(join(DIST, 'sitemap-index.xml'), indexXml, 'utf-8');
console.log(`\n✓ sitemap-index.xml (${sitemapIndexEntries.length} sitemaps)`);
console.log('Done.');
