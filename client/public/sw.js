/* Bella Casa service worker.
 *
 * Hand-written on purpose (no build plugin), so what it does is all on this page.
 * Bump VERSION to throw away every cache the next time the strategy changes;
 * normal site updates don't need it.
 *
 *   - Pages (navigations): network first. A visitor online always gets the
 *     newest site. If the network fails or is very slow, the last copy of the
 *     app shell is shown instead, or /offline.html when there is none.
 *   - /assets/* (Vite output, file names carry a content hash): cache first.
 *   - Brand images, icons and other same-origin static files: stale while
 *     revalidate.
 *   - Public content API (site settings, categories, products, page content):
 *     network first, last good copy used when offline, so rooms and products
 *     already seen can still be browsed without a connection.
 *
 * Everything else is left alone and goes straight to the network: every
 * non-GET request, /api/admin, /api/dashboard, /api/sales, /api/contact,
 * /api/uploads, and anything requested from inside the CMS (/bellacasa-cms).
 * Nothing private is ever cached, and the CMS never shows stale data.
 */

const VERSION = 'v1';
const SHELL_CACHE = `bellacasa-shell-${VERSION}`;
const ASSET_CACHE = `bellacasa-assets-${VERSION}`;
const API_CACHE = `bellacasa-api-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE];

const ADMIN_PREFIX = '/bellacasa-cms';
const PUBLIC_API = /^\/api\/(site-settings|categories|products|content)(\/|$)/;
const NETWORK_TIMEOUT_MS = 4000;
const MAX_ASSET_ENTRIES = 120;
const MAX_API_ENTRIES = 60;

const PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Take over right away; the strategies above are safe for pages that
      // were loaded under the previous worker.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('bellacasa-') && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    if (PUBLIC_API.test(url.pathname) && !isFromAdmin(request)) {
      event.respondWith(networkFirst(request, API_CACHE, MAX_API_ENTRIES));
    }
    return;
  }

  if (url.pathname === '/sw.js') return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE, MAX_ASSET_ENTRIES));
    return;
  }

  if (/\.(?:png|jpe?g|webp|avif|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, ASSET_CACHE, MAX_ASSET_ENTRIES));
  }
});

// Requests the CMS makes carry the CMS page as their referrer. They are left
// to the network so the admin always sees live data, even for the public
// endpoints it shares with the site.
function isFromAdmin(request) {
  try {
    return new URL(request.referrer).pathname.startsWith(ADMIN_PREFIX);
  } catch {
    return false;
  }
}

function isCacheable(response) {
  return response && response.ok && response.type === 'basic';
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

async function store(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (max) await trim(cache, max);
}

async function handleNavigation(request, url) {
  const cache = await caches.open(SHELL_CACHE);
  const inAdmin = url.pathname.startsWith(ADMIN_PREFIX);

  const network = fetch(request).then((response) => {
    // Every route serves the same single-page shell, so one copy covers them all.
    if (isCacheable(response) && response.headers.get('content-type')?.includes('text/html')) {
      cache.put('/', response.clone());
    }
    return response;
  });

  // The CMS is never served from a stale copy of the shell.
  if (inAdmin) {
    return network.catch(() => cache.match('/offline.html'));
  }

  const cachedShell = await cache.match('/');
  if (!cachedShell) {
    return network.catch(() => cache.match('/offline.html'));
  }

  // Cached shell exists: wait for the network, but only so long.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cachedShell), NETWORK_TIMEOUT_MS));
  return Promise.race([network, timeout]).catch(() => cachedShell);
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (isCacheable(response)) await store(cacheName, request, response.clone(), max);
  return response;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) await store(cacheName, request, response.clone(), max);
      return response;
    })
    .catch(() => null);
  // Keep the worker alive until the background refresh has been stored.
  event.waitUntil(refresh);
  if (hit) return hit;
  return (await refresh) || Response.error();
}

async function networkFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (response) => {
    if (isCacheable(response)) {
      await store(cacheName, request, response.clone(), max);
      return response;
    }
    // A server error shouldn't replace a good copy we already have.
    return !response.ok && cached ? cached : response;
  });

  if (!cached) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network, timeout]).catch(() => cached);
}
