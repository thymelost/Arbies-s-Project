// sw.js
const CACHE_NAME = 'arbie-cache-v1';
const CORE_ASSETS = [
  './',             // the entry point
  './index.html',
  './manifest.webmanifest'
  // add icons, CSS, fonts here if you have them
];

// Precache core files (so offline works)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

// Take control ASAP
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first for navigations and same-origin requests; fall back to cache if offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Always try network first for HTML navigations and same-origin GETs
  const isNavigation = req.mode === 'navigate';
  const isSameOrigin = new URL(req.url).origin === self.location.origin;

  if (req.method === 'GET' && (isNavigation || isSameOrigin)) {
    event.respondWith((async () => {
      try {
        // no-store to avoid HTTP cache; SW controls caching explicitly
        const fresh = await fetch(req, { cache: 'no-store' });
        // Update cache copy for offline
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        // Network failed: try cache
        const cached = await caches.match(req);
        if (cached) return cached;
        // ultimate fallback: cached index for navigations
        if (isNavigation) return caches.match('./index.html');
        throw err;
      }
    })());
  }
});
