// Trigger build + deploy after airport enrichment.
// Builds the static site and uploads to Cloudflare Pages.

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Read token from .env
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const [k, v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.trim();
  }
}

console.log('=== Trigger Build + Deploy ===');
console.log('1. Running astro build...');
try {
  execSync('npx astro build', { cwd: ROOT, stdio: 'inherit' });
  console.log('   ✓ Build complete');
} catch (e) {
  console.error('   ✗ Build failed:', e.message);
  process.exit(1);
}

console.log('\n2. Deploying to Cloudflare Pages...');
try {
  execSync('npx wrangler pages deploy dist/ --project-name airportdb --branch main --commit-dirty=true', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN },
  });
  console.log('   ✓ Deploy complete');
} catch (e) {
  console.error('   ✗ Deploy failed:', e.message);
  process.exit(1);
}

console.log('\n=== Done ===');
