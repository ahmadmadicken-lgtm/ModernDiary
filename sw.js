const CACHE_NAME = 'moderndiary-v1';

// File inti yang di-cache supaya app shell bisa terbuka walau koneksi lambat
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Saat service worker pertama kali terpasang
self.addEventListener('install'const CACHE_NAME = 'moderndiary-v2'; // naikkan versi tiap deploy besar supaya cache lama otomatis dibuang

// File inti yang di-cache supaya app shell bisa terbuka walau offline
const CORE_ASSETS = [
  './index.html',
  './dashboard.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // langsung aktifkan versi baru, jangan tunggu semua tab ditutup
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // ambil alih tab yang sudah terbuka, tidak perlu reload manual 2x
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Supabase — data harus selalu fresh & real-time
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  const isHTML = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isHTML) {
    // NETWORK-FIRST untuk halaman HTML: selalu coba ambil versi terbaru dari server dulu.
    // Cache cuma dipakai sebagai cadangan kalau benar-benar offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
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
});, (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Bersihkan cache versi lama saat ada update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategi: network-first untuk data (Supabase API), cache-first untuk app shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Supabase — data harus selalu fresh & real-time
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          // Simpan salinan baru ke cache untuk file statis (html/css/js/icon)
          if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Kalau offline dan tidak ada di cache, fallback ke index.html
          return caches.match('./index.html');
        });
    })
  );
});
