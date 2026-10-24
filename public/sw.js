/* Dulatuon service worker: installable app + offline reading of lessons already opened.
 *
 * - Built assets (/build/assets/*) are content-hashed: cache first, kept until the version changes.
 * - Pages (full loads and Inertia page data): network first, cached copy when offline.
 * - Flipbook images, avatars and fonts: cache first, capped so phones do not fill up.
 * - Anything that is not a GET, or is login/logout/broadcasting, always goes to the network.
 */
const VERSION = 'v1';
const ASSETS = `dulatuon-assets-${VERSION}`;
const PAGES = `dulatuon-pages-${VERSION}`;
const MEDIA = `dulatuon-media-${VERSION}`;
const MEDIA_LIMIT = 150;
const PAGE_LIMIT = 60;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(PAGES)
            .then((cache) => cache.addAll([OFFLINE_URL, '/favicon.svg', '/icons/icon-192.png']))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('dulatuon-') && !key.endsWith(VERSION)).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

const NEVER = [/^\/login/, /^\/logout/, /^\/register/, /^\/broadcasting/, /^\/two-factor/, /^\/sanctum/, /^\/_boost/];

async function trim(cacheName, limit) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - limit; i++) {
        await cache.delete(keys[i]);
    }
}

async function cacheFirst(request, cacheName, limit) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    if (hit) {
        return hit;
    }
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone());
        if (limit) {
            trim(cacheName, limit);
        }
    }

    return response;
}

/** Inertia asks for page data with the same URL as the HTML page, so keep the two apart. */
function pageKey(request) {
    const url = new URL(request.url);
    if (request.headers.get('X-Inertia')) {
        url.searchParams.set('__inertia', '1');
    }

    return url.toString();
}

async function networkFirst(request) {
    const cache = await caches.open(PAGES);
    const key = pageKey(request);
    try {
        const response = await fetch(request);
        if (response.ok && !response.redirected) {
            await cache.put(key, response.clone());
            trim(PAGES, PAGE_LIMIT);
        }

        return response;
    } catch (error) {
        const cached = await cache.match(key);
        if (cached) {
            return cached;
        }
        if (request.mode === 'navigate') {
            return (await cache.match(OFFLINE_URL)) ?? Response.error();
        }
        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);

    if (url.origin === 'https://fonts.bunny.net') {
        event.respondWith(cacheFirst(request, MEDIA, MEDIA_LIMIT));
        return;
    }
    if (url.origin !== self.location.origin || NEVER.some((pattern) => pattern.test(url.pathname))) {
        return;
    }

    if (url.pathname.startsWith('/build/assets/')) {
        event.respondWith(cacheFirst(request, ASSETS));
        return;
    }
    if (
        url.pathname.startsWith('/storage/course-content/flipbook/') ||
        url.pathname.startsWith('/storage/avatars/') ||
        url.pathname.startsWith('/storage/course-thumbnails/') ||
        url.pathname.startsWith('/avatars/') ||
        url.pathname.startsWith('/icons/')
    ) {
        event.respondWith(cacheFirst(request, MEDIA, MEDIA_LIMIT));
        return;
    }

    const wantsPage = request.mode === 'navigate' || request.headers.get('X-Inertia');
    if (wantsPage) {
        event.respondWith(networkFirst(request));
    }
});
