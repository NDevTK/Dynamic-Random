/**
 * @file sw.js
 * @description Service worker: makes Celestial Canvas installable and fully
 * offline-capable. Strategy is network-first with runtime caching — every
 * successfully fetched same-origin asset (the app shell plus all ES modules
 * as they load) lands in the cache, so after one visit the multiverse runs
 * with no connection at all, while online visits always get fresh code.
 * Google Fonts responses are cached opaquely as a best effort.
 */

const CACHE = 'celestial-canvas-v1';

const PRECACHE = [
    './',
    'index.html',
    'css/style.css',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-maskable.svg',
    'js/main.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    const sameOrigin = url.origin === self.location.origin;
    const isFont = url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
    if (!sameOrigin && !isFont) return;

    event.respondWith(
        fetch(req)
            .then((res) => {
                // Runtime-cache anything that arrived intact (opaque allowed for fonts)
                if (res && (res.ok || res.type === 'opaque')) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                }
                return res;
            })
            .catch(() =>
                caches.match(req, { ignoreSearch: sameOrigin && req.mode === 'navigate' })
                    .then((hit) => {
                        if (hit) return hit;
                        // Offline navigation to any ?seed=... falls back to the shell
                        if (req.mode === 'navigate') return caches.match('index.html');
                        return Response.error();
                    })
            )
    );
});
