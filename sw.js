/* FORGE service worker — network-first.
   Online: you always get the newest index.html you uploaded (no stale-app problem).
   Offline: falls back to the last copy that loaded, so the gym still works with no signal. */
const CACHE = 'forge-runtime-v2';

self.addEventListener('install', () => {
  // take over straight away; nothing is precached so a missing file can never break install
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') {
            return caches.match('./index.html').then((h) => h || caches.match('./'));
          }
          return Response.error();
        })
      )
  );
});
