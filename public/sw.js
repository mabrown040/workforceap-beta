/**
 * WorkforceAP Service Worker v4 — PWA offline support + push notifications.
 * Caches shell assets and Google Fonts; push events show branded notifications.
 *
 * v4: stop intercepting Next.js hashed assets so deploys do not keep serving
 *     stale JS/CSS bundles from the service worker cache on mobile clients.
 */

const CACHE_NAME = 'workforceap-v4';
const FONT_CACHE = 'workforceap-fonts-v2';
const STATIC_ASSETS = [
  '/images/logo-tight.png',
];

// Google Fonts origins that should be cached for offline icon support
const FONT_ORIGINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Install: pre-cache key assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove ALL old caches, claim all clients
self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME, FONT_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API: always go to network, never intercept
  if (url.pathname.startsWith('/api/')) return;

  // Let the browser and Vercel handle versioned Next bundles directly.
  // This avoids stale UI after deploys when a mobile client briefly falls back
  // to an older cached JS/CSS asset.
  if (url.pathname.startsWith('/_next/')) return;

  // Navigation requests (HTML pages): always network, never serve stale HTML
  if (event.request.mode === 'navigate') return;

  // Google Fonts: stale-while-revalidate — serve cached if available but always refresh
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((res) => {
            // Cache both normal (200) and opaque (0) responses — font CSS
            // from <link> tags can be opaque cross-origin responses
            if (res.status === 200 || res.type === 'opaque') {
              cache.put(event.request, res.clone());
            }
            return res;
          }).catch(() => cached); // Offline fallback to cache
          // If we have a cached version, serve it but update in background
          if (cached) {
            // Fire-and-forget update
            networkFetch.catch(() => {});
            return cached;
          }
          // No cache yet — wait for network
          return networkFetch;
        })
      )
    );
    return;
  }

  // Static assets (images, CSS, JS): network-first with cache fallback
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

// Push: show branded notification
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title ?? 'Workforce Advancement Project';
  const options = {
    body: data.body ?? 'You have a new update.',
    icon: '/images/logo-tight.png',
    badge: '/images/logo-tight.png',
    tag: data.tag ?? 'workforceap',
    data: { url: data.url ?? '/dashboard' },
    actions: data.actions ?? [{ action: 'open', title: 'Open Portal' }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: navigate to the associated URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
