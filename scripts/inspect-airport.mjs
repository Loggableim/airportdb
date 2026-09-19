// Read a single airport's source code and prepare for desc injection.
// Outputs the matching airport object line range and current state.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const iata = process.argv[2];
if (!iata) {
  console.error('Usage: node inspect-airport.mjs <IATA>');
  process.exit(1);
}

const source = fs.readFileSync(path.join(ROOT, 'src/_data/airports.js'), 'utf-8');
const lines = source.split('\n');

const escapedIata = iata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(`iata:\\s*["']?${escapedIata}["']?`, 'i');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (regex.test(lines[i])) {
    startLine = i;
    break;
  }
}

if (startLine === -1) {
  console.error(`Airport ${iata} not found in source file.`);
  process.exit(1);
}

// Find the closing brace
let endLine = startLine;
let depth = 0;
let foundStart = false;
for (let i = startLine; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') { depth++; foundStart = true; }
    else if (ch === '}') depth--;
  }
  if (foundStart && depth === 0) {
    endLine = i;
    break;
  }
}

console.log(`Airport ${iata} spans lines ${startLine + 1}–${endLine + 1}`);
console.log('---');
for (let i = startLine; i <= endLine; i++) {
  console.log(lines[i]);
}
