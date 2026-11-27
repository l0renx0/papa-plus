// Papà+ — aggiornamenti immediati, e funziona anche senza internet.
// Con internet: prende sempre la versione più nuova dal sito e la salva.
// Senza internet (o se la rete è lenta): usa la copia salvata nel telefono.
const CACHE = 'papa-plus';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png'];
const NET_TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(f, {cache: 'no-store'}).then(r => r.ok && c.put(f, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req, {cache: 'no-store'}),
      new Promise((_, no) => setTimeout(() => no(new Error('lenta')), NET_TIMEOUT_MS))
    ]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./'));
    return Response.error();
  }
}
