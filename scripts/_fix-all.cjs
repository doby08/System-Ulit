const fs = require('fs');
const path = require('path');

const BASE = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit';

function readFile(relPath) {
  return fs.readFileSync(path.join(BASE, relPath), 'utf8');
}

function writeFile(relPath, content) {
// ============================================================
// FIX 2: Rewrite sw.js with proper caching
// ============================================================
console.log('\n=== FIX 2: Rewrite sw.js ===');

const swContent = `const CACHE_NAME = 'wpu-survey-v1';
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell...');
      return cache.addAll(SHELL_URLS).then(() => {
        console.log('[SW] App shell cached');
        return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ).then(() => self.clients.claim());
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isApi = url.pathname.startsWith('/api/');
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2|ttf|eot|html|json)$/.test(url.pathname);

  if (event.request.method !== 'GET') return;

  if (isApi) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  if (isNavigation) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          fetch(event.request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }
        
// ============================================================
// FIX 3: Create offline.html
// ============================================================
console.log('\n=== FIX 3: Create offline.html ===');

const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — WPU Survey</title>
  <meta name="theme-color" content="#05070F">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #05070F;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
    .icon { font-size: 64px; margin-bottom: 20px; opacity: 0.8; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 16px; line-height: 1.5; max-width: 360px; margin-bottom: 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 24px; background: #3B6BF6; color: #fff;
      text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;
      margin-top: 8px; transition: background 0.2s;
    }
    .btn:hover { background: #5C88FB; }
    .note {
      font-size: 14px; color: #64748b; margin-top: 24px;
      padding: 12px; background: rgba(255,255,255,0.05);
      border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
    }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>You're Offline</h1>
  <p>No internet connection detected. If you've opened this survey before, try refreshing to load it from cache.</p>
  <a href="/" class="btn" onclick="window.location.reload(); return false;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 2a9 9 0 0115 6.7L21 16"/>
    </svg>
    Refresh Page
  </a>
  <div class="note">
    <strong>Offline responses are saved automatically.</strong><br>
    Any answers you submit while offline will be stored on this device and synced to the server when you're back online.
  </div>
  <script>
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>
`;

writeFile('public/offline.html', offlineHtml);
console.log('  ✓ offline.html created');
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});
`;

writeFile('public/sw.js', swContent);
console.log('  ✓ sw.js rewritten');
  fs.writeFileSync(path.join(BASE, relPath), content, 'utf8');
  console.log('✓ Updated ' + relPath);
}

console.log('=== Starting offline/sync fixes ===\n');