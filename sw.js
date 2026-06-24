const CACHE = 'woovio-v30';

// Critical app files — cached immediately on install
const PRECACHE = [
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/db.js',
  'js/settings.js',
  'js/receipts.js',
  'js/totals.js',
  'js/pdf.js',
  'js/backup.js',
  'lib/idb.js',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

// Large libs — cached on first successful fetch (runtime caching)
const RUNTIME_CACHE = [
  'lib/pdfmake.min.js',
  'lib/vfs_fonts.js',
];

let offlineMode = true;

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SET_OFFLINE_MODE') {
    offlineMode = e.data.value;
  }
});

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      // Not in cache — check if this is a large lib we should cache at runtime
      const url = new URL(e.request.url);
      const isRuntimeFile = RUNTIME_CACHE.some(f => url.pathname.endsWith(f));

      if (offlineMode && !isRuntimeFile) {
        // Cache-only mode: return offline error for non-lib requests
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }

      // Fetch from network and cache the result for future offline use
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
