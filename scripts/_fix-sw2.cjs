const fs = require('fs');
const path = require('path');

const clientRootPath = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/src/components/client-root.tsx';
let content = fs.readFileSync(clientRootPath, 'utf8');

// Find the ClientRoot function and replace it
const startMarker = "export function ClientRoot({ children }: { children: ReactNode }) {";
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.error("ERROR: Could not find start marker");
  process.exit(1);
}

// Find the end of the function (count braces)
let braceCount = 0;
let endIdx = startIdx;
for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

console.log(`Found ClientRoot from ${startIdx} to ${endIdx}`);

const newClientRoot = `function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'development') {
    return;
  }
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[SW] Registered successfully:', registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });
}

export function ClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    registerServiceWorker();
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  return <Providers>{children}</Providers>;
}`;

const newContent = content.slice(0, startIdx) + newClientRoot + content.slice(endIdx);
fs.writeFileSync(clientRootPath, newContent, 'utf8');
console.log('Fixed client-root.tsx');

// Fix 2: Update sw.js to properly cache app shell on install
const swPath = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/public/sw.js';
const swContent = fs.readFileSync(swPath, 'utf8');

// Replace the install handler
const oldInstall = "self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(self.clients.claim()); });";
const newInstall = `self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('wpu-survey-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/manifest.webmanifest',
      ]).catch((err) => {
        console.warn('[SW] Failed to cache some resources:', err);
        return self.skipWaiting();
      });
    })
  );
  self.skipWaiting();
});`;

if (swContent.includes(oldInstall)) {
  const updatedSw = swContent.replace(oldInstall, newInstall);
  fs.writeFileSync(swPath, updatedSw, 'utf8');
  console.log('Fixed sw.js install handler');
} else {
  console.log('WARNING: Could not find old install pattern in sw.js');
  console.log('sw.js starts with:', swContent.slice(0, 100));
}

// Fix 3: Create offline.html if it doesn't exist
const offlineHtmlPath = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/public/offline.html';
if (!fs.existsSync(offlineHtmlPath)) {
  const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - WPU Survey</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #05070F;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #3B6BF6;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #5C88FB; }
    .note { font-size: 14px; color: #64748b; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128222;</div>
    <h1>You're Offline</h1>
    <p>No internet connection detected. If you've opened this survey before, try refreshing to load it from cache.</p>
    <a href="/" class="btn">Go to Home</a>
    <p class="note">Responses submitted while offline will be saved and synced automatically when you're back online.</p>
  </div>
</body>
</html>`;
  fs.writeFileSync(offlineHtmlPath, offlineHtml, 'utf8');
  console.log('Created offline.html');
} else {
  console.log('offline.html already exists');
}

console.log('All fixes applied!');