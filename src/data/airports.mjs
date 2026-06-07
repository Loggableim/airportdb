import fs from 'node:fs';
// Read the JSON data file and export it
const raw = fs.readFileSync(new URL('top500.json', import.meta.url), 'utf-8');
export default JSON.parse(raw);