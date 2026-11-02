const CACHE_STATIC  = 'playlist-static-v3';
const CACHE_DYNAMIC = 'playlist-dynamic-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './App.css',
  './App.js',
  './Manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isApi = url.pathname.includes('/api/');

  if (isApi) {
    e.respondWith(networkFirstCache(e.request));
  } else if (url.origin === location.origin) {
    e.respondWith(cacheFirst(e.request));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_STATIC);
  return (await cache.match(req)) || fetch(req);
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