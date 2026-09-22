const fs = require('fs');
const p = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/public/sw.js';

// Read as binary to preserve line endings
let content = fs.readFileSync(p);

// Replace the broken install handler (no-cors bug)
const oldInstall = [
  'self.addEventListener("install", (e) => {',
  '  // Cache the app shell. Use individual put() calls so one bad URL doesn\'t',
  '  // abort the whole install \u2014 the SW still activates even if some shells fail.',
  '  e.waitUntil(',
  '    caches.open(CACHE).then((cache) =>',
  '      Promise.all(',
  '        SHELL.map((url) =>',
  '          fetch(url, { mode: "no-cors" })',
  '            .then((r) => { if (r.ok) return cache.put(url, r); })',
  '            .catch(() => {}),',
  '        ),',
  '      ).then(() => self.skipWaiting()),',
  '    ),',
  '  );',
  '});'
].join('\n');

const newInstall = [
  'self.addEventListener("install", (e) => {',
  '  // Cache the app shell. Use default fetch mode so r.ok works;',
  '  // opaque no-cors responses have status 0 \u2014 cache them too.',
  '  e.waitUntil(',
  '    caches.open(CACHE_NAME).then((cache) =>',
  '      Promise.all(',
  '        SHELL_URLS.map((url) =>',
  '          fetch(url).then((r) => {',
  '            // Opaque (no-cors) responses have status 0 \u2014 cache them too',
  '            if (r.ok || r.type === "opaque") return cache.put(url, r);',
  '            return Promise.reject(new Error("HTTP " + r.status + " for " + url));',
  '          }).catch(() => {}),',
  '        ),',
  '      ).then(() => self.skipWaiting())',
  '    )',
  '  )',
  '});'
].join('\n');

// Also fix variable names
let updated = content.toString().replace(oldInstall, newInstall);
updated = updated.replace(/const CACHE = /g, 'const CACHE_NAME = ');
updated = updated.replace(/const SHELL = \[/g, 'const SHELL_URLS = [');
updated = updated.replace(/SHELL\.map/g, 'SHELL_URLS.map');
updated = updated.replace(/caches\.open\(CACHE\)/g, 'caches.open(CACHE_NAME)');
updated = updated.replace(/k !== CACHE/g, 'k !== CACHE_NAME');

fs.writeFileSync(p, updated);
console.log('✓ sw.js fully fixed');