/**
 * WorkforceAP Service Worker v9 — PWA offline support + push notifications.
 * Caches shell assets; push events show branded notifications.
 *
 * v9: restrict runtime GET caching to same-origin static assets only (skip
 *     cross-origin responses entirely — e.g. Supabase signed storage URLs for
 *     member avatars/resumes/certificates — so private, tokenized URLs never
 *     land in Cache Storage); guard the offline navigation fallback against
 *     caches.match resolving undefined; make notificationclick prefer a
 *     client already on the target URL and fall back to clients.openWindow
 *     when client.navigate() rejects (it always rejects for uncontrolled
 *     clients); point the notification icon/badge and apple-touch-icon at the
 *     existing square icon-192x192.png instead of the non-square wap_logo.png.
 *     Bumps CACHE_NAME so clients purge the old unrestricted cache.
 * v8: bump CACHE_NAME to force a full cache purge on every client (drops any
 *     stale shell/offline/asset entries that were wedging mobile clients on
 *     the loading skeleton or the "You're offline" page after the dashboard
 *     reliability fixes). Also stop intercepting RSC payload requests
 *     (`?_rsc=` / `RSC: 1`) — serving a stale/partial RSC response can hang
 *     client-side navigation on the skeleton; always let those hit the network.
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

const CACHE_NAME = 'workforceap-v9';
const OFFLINE_PAGE = '/offline.html';
const STATIC_ASSETS = [
  '/images/wap_logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/fonts/material-symbols-outlined.woff2',
  OFFLINE_PAGE,
];

// Minimal inline fallback used only if the precached OFFLINE_PAGE entry was
// evicted from Cache Storage under storage pressure (or a v8 install
// partially failed) — caches.match(OFFLINE_PAGE) can legitimately resolve
// undefined, and respondWith(undefined) would surface a generic browser
// network error instead of a branded page.
const OFFLINE_FALLBACK_RESPONSE = () =>
  new Response(
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<title>Offline — WorkforceAP</title></head><body style="font-family:sans-serif;' +
      'text-align:center;padding:3rem 1.5rem;">' +
      '<h1>You’re offline</h1>' +
      '<p>We can’t reach the internet right now. Please check your connection and try again.</p>' +
      '</body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

// Static-asset paths eligible for the runtime cache. Anything not matching
// one of these prefixes falls through to the network with no caching —
// authenticated/dynamic responses (member avatars, uploaded resumes/
// certificates, Supabase signed URLs, etc.) must never be persisted.
const RUNTIME_CACHEABLE_PREFIXES = ['/images/', '/fonts/', '/icons/'];

function isRuntimeCacheableStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return RUNTIME_CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

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

  // Never intercept React Server Component payloads. A cached or partial RSC
  // response can wedge client-side navigation on the loading skeleton (and
  // serve stale dashboard data). Always let these hit the network directly.
  if (url.searchParams.has('_rsc') || event.request.headers.get('RSC') === '1') return;

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
        .catch(() =>
          caches.match(OFFLINE_PAGE).then((cached) => cached || OFFLINE_FALLBACK_RESPONSE())
        )
    );
    return;
  }

  // Static assets (images, fonts): network-first with cache fallback, and
  // only for same-origin requests under an explicit allowlist of static
  // paths. Cross-origin GETs (e.g. Supabase signed storage URLs) and any
  // same-origin path outside the allowlist (dynamic/authenticated HTML,
  // API-adjacent JSON, etc.) are never written to Cache Storage.
  if (event.request.method === 'GET' && isRuntimeCacheableStaticAsset(url)) {
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
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-192x192.png',
    tag: typeof data.tag === 'string' ? data.tag : 'workforceap',
    data: { url: safeUrl },
    actions,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: focus (and navigate) an existing window, or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = sanitizeNotificationUrl(event.notification.data?.url) ?? '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const sameOrigin = [];
      for (const client of clientList) {
        try {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            sameOrigin.push(client);
          }
        } catch {
          // skip malformed client URLs
        }
      }

      // Prefer a client already sitting on the target URL — no navigation needed.
      const exactMatch = sameOrigin.find((client) => {
        try {
          return new URL(client.url).pathname === new URL(url, self.location.origin).pathname;
        } catch {
          return false;
        }
      });
      if (exactMatch) return exactMatch.focus();

      // Otherwise try the first same-origin window. client.navigate() rejects
      // with InvalidAccessError for uncontrolled clients (which
      // includeUncontrolled explicitly allows to be matched here), so it must
      // be awaited and caught — never left as a dangling rejected promise.
      const target = sameOrigin[0];
      if (target) {
        try {
          const navigated = await target.navigate(url);
          return (navigated || target).focus();
        } catch {
          return clients.openWindow ? clients.openWindow(url) : target.focus();
        }
      }

      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
