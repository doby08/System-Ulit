self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(self.clients.claim()); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
