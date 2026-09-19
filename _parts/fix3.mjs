import { readFileSync, writeFileSync } from 'node:fs';
let f = readFileSync('_parts/handlers.mjs', 'utf8');
const anchor = "  .map((p) => stripReexports(stripContexts(stripImports(read(p)))))";
const aliases = [
  '',
  'type Context = { params: Promise<Record<string, string>> };',
  'type QuestionContext = Context;',
  'type BankContext = Context;',
  'type RespondentContext = Context;',
  'type ResponseContext = Context;',
  'type ReportContext = Context;',
  'type QrContext = Context;',
  'type SyncContext = Context;',
  '',
].join('\n');
const block = anchor + `.join('\\n\\n');\nconst contextAliases = \`${aliases}\`;`;
f = f.replace(anchor + ".join('\\n\\n');", block);
// use the alias block when assembling
f = f.replace("writeFileSync('src/lib/server/handlers.ts', header + '\\n' + parts, 'utf8');", "writeFileSync('src/lib/server/handlers.ts', header + '\\n' + contextAliases + '\\n' + parts, 'utf8');");
// zero-arg set for route generator
let g = readFileSync('scripts/gen-routes.mjs', 'utf8');
g = g.replace('const ZERO_ARG = new Set(["GET_TAGS", "GET_APP_SETTINGS", "GET"]);', 'const ZERO_ARG = new Set(["GET_TAGS", "GET_APP_SETTINGS", "GET", "GET_FACETS"]);');
writeFileSync('scripts/gen-routes.mjs', g, 'utf8');
writeFileSync('_parts/handlers.mjs', f, 'utf8');
console.log('handlers.mjs + gen-routes patched');
