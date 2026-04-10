/**
 * WorkforceAP Service Worker — PWA offline support + push notifications.
 * Caches shell assets; push events show branded notifications.
 */

const CACHE_NAME = 'workforceap-v1';
const STATIC_ASSETS = [
  '/dashboard',
  '/images/logo-tight.png',
];

// Install: pre-cache key pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API; cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // Always network for API

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
