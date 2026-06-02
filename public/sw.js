/**
 * WorkforceAP Service Worker v7 — PWA offline support + push notifications.
 * Caches shell assets; push events show branded notifications.
 *
 * v7: stop caching fonts.googleapis.com / fonts.gstatic.com (icons are self-hosted).
 *     Bumps CACHE_NAME so clients drop any stale full Material Symbols from Google.
 * v6: strip locale prefix before matching authenticated routes so
 *     `/es/dashboard` etc. aren't accidentally cached. Bumps CACHE_NAME so
 *     `activate` purges any v5 cache that may have stored localized
 *     private HTML.
 * v5: added offline fallback page, new icon assets, and navigation caching.
 * v4: stop intercepting Next.js hashed assets so deploys do not keep serving
 *     stale JS/CSS bundles from the service worker cache on mobile clients.
 */

const CACHE_NAME = 'workforceap-v7';
const OFFLINE_PAGE = '/offline.html';
const STATIC_ASSETS = [
  '/images/wap_logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/fonts/material-symbols-outlined.woff2',
  OFFLINE_PAGE,
];

// Install: pre-cache key assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove ALL old caches, claim all clients
self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME]);
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

  // Navigation requests (HTML pages): network-first with offline fallback.
  //
  // Do NOT cache HTML navigations at all. Public-route HTML caching sounds
  // cheap, but in practice it can serve stale shells across deploys and create
  // route/content mismatches on mobile clients after a frontend release. The
  // site already avoids caching authenticated HTML; extend that rule to public
  // marketing pages so fresh server HTML always matches the active JS bundle.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => res)
        .catch(() => caches.match(OFFLINE_PAGE))
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

// Only allow notifications to deep-link to same-origin paths. A push
// payload that ships `data.url = "https://evil.example/..."` would
// otherwise launch the malicious URL from inside the installed PWA
// with the user's trust. Returns a safe in-app path or null.
function sanitizeNotificationUrl(input) {
  if (typeof input !== 'string' || input.length === 0) return null;
  try {
    const resolved = new URL(input, self.location.origin);
    if (resolved.origin !== self.location.origin) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}

// Push: show branded notification
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === 'string' ? data.title : 'Workforce Advancement Project';
  const safeUrl = sanitizeNotificationUrl(data.url) ?? '/dashboard';
  const actions = Array.isArray(data.actions) ? data.actions : [{ action: 'open', title: 'Open Portal' }];
  const options = {
    body: typeof data.body === 'string' ? data.body : 'You have a new update.',
    icon: '/images/wap_logo.png',
    badge: '/images/wap_logo.png',
    tag: typeof data.tag === 'string' ? data.tag : 'workforceap',
    data: { url: safeUrl },
    actions,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: navigate to the associated URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = sanitizeNotificationUrl(event.notification.data?.url) ?? '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        } catch {
          // skip malformed client URLs
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
