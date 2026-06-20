const CACHE_NAME = 'moderndiary-v4'; // naikkan versi tiap deploy besar supaya cache lama otomatis dibuang

// Aset statis saja yang dicache — HTML sengaja TIDAK di-handle Service Worker sama sekali,
// supaya browser selalu ambil versi terbaru secara native, tanpa campur tangan SW yang sering bikin bingung.
const CORE_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Supabase
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  const isHTML = event.request.mode === 'navigate' || event.request.destination === 'document';

  // HTML: JANGAN diintercept sama sekali. Biarkan browser fetch native seperti website biasa.
  // Ini menghilangkan SEMUA kemungkinan SW jadi penyebab konten basi.
  if (isHTML) {
    return;
  }

  // CACHE-FIRST untuk aset statis (icon, manifest) yang jarang berubah
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
