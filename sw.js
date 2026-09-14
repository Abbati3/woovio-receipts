const CACHE = 'woovio-v49';

// The PDF engine and its fonts (about 1.7MB) live in their own cache that
// survives updates. They download once, not again with every version, and a PDF
// can still be made offline straight after an update. Bump this name only if
// those two files ever change.
const LIB_CACHE = 'woovio-libs-v1';

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

const LIBS = [
  'lib/pdfmake.min.js',
  'lib/vfs_fonts.js',
];

// Files come from the cache first, so the app opens instantly with or without a
// connection. Updates never pass through the fetch handler: the browser fetches
// sw.js itself to look for a new version, and a new worker's install bypasses it
// — so no switch to block the network is needed, and none is offered.

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const core = await caches.open(CACHE);
    // cache:'reload' bypasses the browser HTTP cache so a new version always
    // precaches genuinely fresh files, never stale copies
    await core.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })));

    // Fetched only if this device does not already hold them
    const libs = await caches.open(LIB_CACHE);
    for (const u of LIBS) {
      if (!(await libs.match(u))) await libs.add(new Request(u, { cache: 'reload' }));
    }
    // If anything above failed, the install fails as a whole and the version
    // already running carries on untouched — a half-downloaded update never lands.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // The shoes app shares this origin's cache storage, so only this app's own
      // old versions are removed — never the shoes app's, and never the libraries.
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('woovio-') && k !== CACHE && k !== LIB_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(response => {
      if (response.ok && e.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(() => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })))
  );
});
