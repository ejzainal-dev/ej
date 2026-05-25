// =============================================
//  DigiSolution — Service Worker
//  Versi: 1.0.0
// =============================================

const CACHE_NAME     = 'digisolution-v1';
const OFFLINE_PAGE   = '/offline.html';

// Fail-fail yang akan dicache semasa install
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html'
];

// =============================================
//  INSTALL — Cache semua asset penting
// =============================================
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Aktif terus tanpa tunggu
    );
});

// =============================================
//  ACTIVATE — Padam cache lama
// =============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Ambil alih semua tab terus
    );
});

// =============================================
//  FETCH — Strategi: Network First, Cache Fallback
// =============================================
self.addEventListener('fetch', event => {
    // Skip request bukan GET
    if (event.request.method !== 'GET') return;

    // Skip request dari extension / chrome-extension
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Kalau berjaya dari network, update cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Network gagal — cuba dari cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Kalau tiada dalam cache, tunjuk halaman offline
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_PAGE);
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
