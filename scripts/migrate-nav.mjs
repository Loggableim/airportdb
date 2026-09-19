#!/usr/bin/env node
// One-shot migration: replace old inline nav/footer blocks with <SiteNav /> and <SiteFooter /> imports
// Used on: countries/index, countries/[slug], tools/index, tools/distance-calculator, 404

import fs from 'fs';
import path from 'path';

const ROOT = 'C:/HermesPortable/home/spaces/airportdb/src/pages';
const FILES = [
  'countries/index.astro',
  'countries/[slug].astro',
  'tools/index.astro',
  'tools/distance-calculator/index.astro',
  '404.astro',
];

// Detect existing import zone (between `---` and `<!DOCTYPE`)
function injectImports(content, filePath) {
  // Already has imports for SiteNav?
  if (content.includes('SiteNav.astro') || content.includes('SiteFooter.astro')) {
    return content;
  }
  // For 404.astro: no ---; skip import (it has no frontmatter)
  if (filePath.endsWith('404.astro')) {
    // Wrap body in frontmatter with imports
    return `---
import SiteNav from '../components/SiteNav.astro';
import SiteFooter from '../components/SiteFooter.astro';
---
` + content;
  }
  // Compute relative import path from file to components
  let depth = filePath.split('/').length - 1;
  if (filePath.endsWith('/index.astro')) depth -= 1;
  // For 404.astro at root: '../components'
  const prefix = filePath === '404.astro' ? '../' : '../'.repeat(depth);
  // For tools/distance-calculator/index.astro: 3 levels up = '../../../'
  let importPath = '';
  if (filePath === 'countries/index.astro') importPath = '../../components/';
  else if (filePath === 'countries/[slug].astro') importPath = '../../components/';
  else if (filePath === 'tools/index.astro') importPath = '../../components/';
  else if (filePath === 'tools/distance-calculator/index.astro') importPath = '../../../components/';
  else if (filePath === '404.astro') importPath = '../components/';
  const importBlock = `import SiteNav from '${importPath}SiteNav.astro';\nimport SiteFooter from '${importPath}SiteFooter.astro';\n`;
  // Insert after the last existing import (or after `---` line)
  const dashEnd = content.indexOf('---\n');
  if (dashEnd < 0) return content;
  const afterDash = dashEnd + 4;
  // Find last import line
  const slice = content.slice(afterDash);
  const importMatch = slice.match(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*\n/gm);
  if (importMatch) {
    const last = importMatch[importMatch.length - 1];
    const lastIdx = slice.lastIndexOf(last) + last.length;
    return content.slice(0, afterDash) + slice.slice(0, lastIdx) + importBlock + slice.slice(lastIdx);
  }
  return content.slice(0, afterDash) + importBlock + slice;
}

// Find the old nav block: <nav style="background:#0f172a...">...</nav>
const NAV_REGEX = /<nav\s+style="background:#0f172a[^"]*"[^>]*>[\s\S]*?<\/nav>/g;
const NAV_REGEX2 = /<nav class="top-nav"[\s\S]*?<\/nav>/g;

function replaceNav(content, filePath) {
  // Determine active
  let active = '';
  if (filePath.startsWith('countries')) active = 'countries';
  else if (filePath.startsWith('tools/distance-calculator')) active = 'tools';
  else if (filePath === '404.astro') active = '';
  else if (filePath.startsWith('tools')) active = 'tools';
  const replacement = `<SiteNav active="${active}" />`;
  let out = content.replace(NAV_REGEX, replacement);
  out = out.replace(NAV_REGEX2, replacement);
  return out;
}

// Find the old footer block: <footer>...</footer> (inline, not in a file we control)
const FOOTER_REGEX = /<footer[^>]*>[\s\S]*?<\/footer>/g;

function replaceFooter(content) {
  return content.replace(FOOTER_REGEX, '<SiteFooter />');
}

let updated = 0;
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', rel); continue; }
  let content = fs.readFileSync(p, 'utf-8');
  const before = content.length;
  content = injectImports(content, rel);
  content = replaceNav(content, rel);
  content = replaceFooter(content);
  fs.writeFileSync(p, content, 'utf-8');
  console.log('OK:', rel, '(' + (content.length - before) + ' bytes delta)');
  updated++;
}
console.log('---');
console.log('Migrated:', updated, 'files');
