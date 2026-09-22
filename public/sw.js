const CACHE_NAME = "wpu-survey-v1";
const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
];

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync: when the browser wakes up the service worker to retry,
// notify all clients to re-attempt syncing pending responses.
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-responses") {
    console.log("[SW] Background sync event received");
    e.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
        if (clients.length === 0) {
          // No clients open — post a message to all clients
          // The client-side sync listener will handle this
          console.log("[SW] No clients open for background sync");
          return;
        }
        // Notify all client tabs to trigger sync
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      }).catch((err) => {
        console.error("[SW] Background sync failed:", err);
      }),
    );
  }
});

// Periodic sync: check for updates when the browser allows it
self.addEventListener("periodicsync", (e) => {
  // @ts-expect-error - not in TS types yet
  if (e.tag === "survey-update-check") {
    e.waitUntil(
      caches.match("/").then((resp) => {
        // The client will fetch fresh survey data on visibility change
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "CHECK_UPDATES" });
          });
        });
      }),
    );
  }
});

self.addEventListener("install", (e) => {
  // Cache the app shell. Use default fetch mode so r.ok works;
  // opaque no-cors responses have status 0 — cache them too.
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          fetch(url).then((r) => {
            // Opaque (no-cors) responses have status 0 — cache them too
            if (r.ok || r.type === "opaque") return cache.put(url, r);
            return Promise.reject(new Error("HTTP " + r.status + " for " + url));
          }).catch(() => {}),
        ),
      ).then(() => self.skipWaiting())
    )
  )
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// App shell: serve cached "/" for ALL navigations so the React app loads offline.
// React Router (or Next.js client nav) then renders the right route, and
// useCachedSurvey reads the survey from IndexedDB.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isShell = e.request.mode === "navigate";
  const isApi = url.pathname.startsWith("/api/");
  const isStatic = /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?|ttf|eot)$/.test(url.pathname);

  if (e.request.method !== "GET") return;

  if (isApi) {
    // Network-first for API calls; cache nothing on failure (responses are dynamic)
    e.respondWith(
      fetch(e.request)
        .then((r) => (r.ok ? r : Promise.reject(r)))
        .catch(() => {
          // Return cached response if any (e.g. cached survey payload)
          return caches.match(e.request).then((cached) => cached || Promise.reject("offline"));
        }),
    );
    return;
  }

  if (isShell) {
    // Serve the cached app shell (cached "/") for ALL navigations so the React
    // app loads offline. React then reads the URL and renders the right route;
    // useCachedSurvey reads the survey from IndexedDB.
    e.respondWith(
      caches.match("/").then((shell) => {
        if (shell) return shell;
        return fetch(e.request)
          .then((r) => {
            if (r.ok) {
              const clone = r.clone();
              caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
              return r;
            }
            return caches.match("/offline.html");
          })
          .catch(() => caches.match("/offline.html"));
      }),
    );
    return;
  }

  if (isStatic) {
    // Cache-first for static assets
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((r) => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match("/offline.html"))),
    );
    return;
  }

  // Default: network-first
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((c) => c || Promise.reject("offline"))),
  );
});
