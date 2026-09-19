import { readFileSync, writeFileSync } from 'node:fs';
let f = readFileSync('_parts/handlers.mjs', 'utf8');
const lines = f.split('\n');
const out = [];
let seenContext = 0;
for (const line of lines) {
  if (/^type Context = \{ params: Promise<Record<string, string>> \};$/.test(line.trim())) {
    seenContext += 1;
    if (seenContext > 1) continue;
  }
  out.push(line);
}
writeFileSync('_parts/handlers.mjs', out.join('\n'), 'utf8');
console.log('deduped Context declarations:', seenContext);
