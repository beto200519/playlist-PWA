const CACHE_STATIC  = 'playlist-static-v4';
const CACHE_DYNAMIC = 'playlist-dynamic-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './App.css',
  './App.js',
  './Manifest.webmanifest'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(async cache => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] No se pudo cachear:', asset);
        }
      }
      return self.skipWaiting();
    })
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => ![CACHE_STATIC, CACHE_DYNAMIC].includes(k))
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // 1) Navegación HTML → app shell fallback (evita el dinosaurio)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_STATIC);
        return (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('Sin conexión', { status: 503 });
      })
    );
    return;
  }

  // 2) API → network-first con fallback a cache
  if (url.pathname.includes('/api/')) {
    e.respondWith(networkFirstCache(req));
    return;
  }

  // 3) Estáticos → cache-first con fallback a red
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    return await fetch(req);
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}

async function networkFirstCache(req) {
  const cache = await caches.open(CACHE_DYNAMIC);
  try {
    const fresh = await fetch(req);
    if (req.method === 'GET' && fresh.ok) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(req);
    return cached || new Response(
      JSON.stringify([]),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}