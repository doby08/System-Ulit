const fs = require('fs');
const p = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/public/sw.js';

let lines = fs.readFileSync(p, 'utf8').split('\n');
let output = [];
let i = 0;

// Find and replace the install handler
while (i < lines.length) {
  const line = lines[i];
  
  // Detect start of old install handler
  if (line.includes('self.addEventListener("install"') && line.includes('// Cache the app shell')) {
    // Skip the entire old install block until we find the closing });
    let depth = 0;
    let foundStart = false;
    let j = i;
    
    // Collect the old block to skip
    while (j < lines.length) {
      const l = lines[j];
      if (l.includes('self.addEventListener("install"')) {
        foundStart = true;
      }
      // Count braces to find end of the handler
      for (const ch of l) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (foundStart && depth === 0 && l.trim() === '});') {
        // Found end of old handler
        break;
      }
      j++;
    }
    
    // Write new install handler
    output.push('self.addEventListener("install", (e) => {');
    output.push('  // Cache the app shell. Use default cors mode so r.ok works;');
    output.push('  // opaque no-cors responses (cross-origin) have status 0 — cache them too.');
    output.push('  e.waitUntil(');
    output.push('    caches.open(CACHE_NAME).then((cache) =>');
    output.push('      Promise.all(');
    output.push('        SHELL_URLS.map((url) =>');
    output.push('          fetch(url).then((r) => {');
    output.push('            // Opaque (no-cors) responses have status 0 — cache them too');
    output.push('            if (r.ok || r.type === "opaque") return cache.put(url, r);');
    output.push('            return Promise.reject(new Error("HTTP " + r.status + " for " + url));');
    output.push('          }).catch(() => {}),');
    output.push('        ),');
    output.push('      ).then(() => self.skipWaiting())');
    output.push('    )');
    output.push('  )');
    output.push('});');
    
    i = j + 1;
    continue;
  }
  
  output.push(line);
  i++;
}

fs.writeFileSync(p, output.join('\n'), 'utf8');
console.log('✓ sw.js install handler fixed');