const CACHE_NAME = "wpu-survey-v2";
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

self.addEventListener("sync", (e) => {
  if (e.tag === "sync-responses") {
    console.log("[SW] Background sync event received");
    e.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
        if (clients.length === 0) {
          console.log("[SW] No clients open for background sync");
          return;
        }
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_SYNC" });
        });
      }).catch((err) => {
        console.error("[SW] Background sync failed:", err);
      }),
    );
  }
});

self.addEventListener("periodicsync", (e) => {
  // @ts-expect-error - not in TS types yet
  if (e.tag === "survey-update-check") {
    e.waitUntil(
      caches.match("/").then(() => {
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
  // Cache offline fallbacks only; failures tolerated, SW still activates.
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_URLS.map((url) =>
          fetch(url).then((r) => {
            if (r.ok || r.type === "opaque") return cache.put(url, r);
            return Promise.reject(new Error("HTTP " + r.status + " for " + url));
          }).catch(() => {}),
        ),
      ).then(() => self.skipWaiting())
    )
  );
});

self.addEventListener("activate", (e) => {
  // Purge every older cache (incl. stale "wpu-survey-v1" shell that was
  // served for ALL navigations and caused frozen black screens).
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept mutations (login/logout/submit…).
  if (e.request.method !== "GET") return;

  // API: NETWORK-FIRST; store only public survey reads, replay only offline.
  if (url.pathname.startsWith("/api/")) {
    const isPublicRead = url.pathname.startsWith("/api/public/");
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok && isPublicRead) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return r;
        })
        .catch(() => {
          if (isPublicRead) {
            return caches.match(e.request).then((cached) => cached || Promise.reject(new Error("offline")));
          }
          return Promise.reject(new Error("offline"));
        }),
    );
    return;
  }

  // Navigations: NETWORK-FIRST — always the freshly deployed HTML. The old
  // behaviour (cached "/" for EVERY navigation) served stale HTML after each
  // deploy → dead hashed chunks → frozen black screen, no login form.
  // Cached shell is now an OFFLINE-only fallback for the respondent PWA.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match("/").then((shell) => shell || caches.match("/offline.html")),
      ),
    );
    return;
  }

  // Static: cache-first; /_next/static/ is content-hashed so URLs are safe.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?|ttf|eot)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request)
            .then((r) => {
              if (r.ok) {
                const clone = r.clone();
                caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
              }
              return r;
            })
            .catch(() => caches.match("/offline.html")),
      ),
    );
    return;
  }

  // Everything else: network-first with cache fallback.
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((cached) => cached || Promise.reject(new Error("offline"))),
    ),
  );
});
