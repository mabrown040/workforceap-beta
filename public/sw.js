/**
 * WorkforceAP Service Worker — PWA offline support + push notifications.
 * Caches shell assets and Google Fonts; push events show branded notifications.
 */

const CACHE_NAME = 'workforceap-v2';
const FONT_CACHE = 'workforceap-fonts-v1';
const STATIC_ASSETS = [
  '/dashboard',
  '/images/logo-tight.png',
];

// Google Fonts origins that should be cached for offline icon support
const FONT_ORIGINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Install: pre-cache key pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches (keep current + font cache)
self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME, FONT_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API; stale-while-revalidate for fonts; network-first for the rest
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // Always network for API

  // Google Fonts: cache-first so icons always render in PWA
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((res) => {
            if (res.status === 200) cache.put(event.request, res.clone());
            return res;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache successful GET responses for static assets
        if (event.request.method === 'GET' && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
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
