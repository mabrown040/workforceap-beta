const APP_LOCALES = ['en', 'es', 'fr', 'pt'];

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

function stripLocalePrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && APP_LOCALES.includes(parts[0]!)) {
    const rest = parts.slice(1);
    return rest.length === 0 ? '/' : `/${rest.join('/')}`;
  }
  return pathname;
}

function isPortalRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  const portalPrefixes = [
    '/dashboard',
    '/admin',
    '/counselor',
    '/employer',
    '/partner',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-mfa',
    '/setup-mfa',
  ];
  return portalPrefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

let captureRouterTransitionStart: ((href: string, navigationType: string) => void) | undefined;
let initPromise: Promise<void> | null = null;

/** PII-bearing query-string keys that should be stripped from breadcrumb URLs
 *  before they reach Sentry. */
const PII_QUERY_KEYS = new Set([
  'email',
  'phone',
  'token',
  'code',
  'reset_token',
  'access_token',
  'refresh_token',
  'magic_link',
  'invite_token',
  'tokenHash',
  'token_hash',
]);

function scrubUrlForBreadcrumb(value: string): string {
  try {
    const url = new URL(value, 'https://internal.invalid');
    let mutated = false;
    for (const key of [...url.searchParams.keys()]) {
      if (PII_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, '[redacted]');
        mutated = true;
      }
    }
    return mutated ? url.toString() : value;
  } catch {
    return value;
  }
}

async function initSentry() {
  if (!dsn || !isProduction) return;

  const Sentry = await import('@sentry/nextjs');

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? '0.01'),
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      // Replay default is to render the DOM verbatim. For a portal that
      // shows member names, emails, phone numbers, resume content, WIOA
      // qualification answers, etc., that's a hard-blocking privacy
      // problem if anyone with Sentry access can scrub through replays.
      // Mask everything by default; surface only what we explicitly
      // mark as safe.
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    // Strip PII from breadcrumb URLs before they're stored on Sentry.
    // Auto-captured fetch/navigation breadcrumbs include the full URL,
    // so /forgot-password?email=…, /invite?token=…, etc. would otherwise
    // ship the PII to Sentry's index.
    beforeBreadcrumb(breadcrumb) {
      try {
        const data = breadcrumb.data as { url?: string; from?: string; to?: string } | undefined;
        if (data?.url && typeof data.url === 'string') {
          data.url = scrubUrlForBreadcrumb(data.url);
        }
        if (data?.from && typeof data.from === 'string') {
          data.from = scrubUrlForBreadcrumb(data.from);
        }
        if (data?.to && typeof data.to === 'string') {
          data.to = scrubUrlForBreadcrumb(data.to);
        }
      } catch {
        // never let a scrubber failure drop the breadcrumb
      }
      return breadcrumb;
    },
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  });

  captureRouterTransitionStart = Sentry.captureRouterTransitionStart;
}

function maybeInitSentry(href?: string) {
  if (initPromise) return;
  const pathname = href ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!isPortalRoute(pathname)) return;
  initPromise = initSentry();
}

/** Required by @sentry/nextjs for App Router navigation tracing.
 *  Lazily loads Sentry so marketing pages don't pay the 420KB chunk cost. */
export const onRouterTransitionStart = (href: string) => {
  maybeInitSentry(href);
  captureRouterTransitionStart?.(href, 'push');
};

// Initialize immediately on portal routes (initial page load)
maybeInitSentry();

/**
 * Associate (or clear) the authenticated user on the client Sentry scope.
 * ID ONLY — never pass email, name, or other PII (AUDIT §H-S7 privacy
 * posture mirrored from the replay/breadcrumb scrubbing above).
 *
 * Called by <SentrySetUser> once the root layout resolves the current
 * user server-side, and again with `null` on logout. No-ops when Sentry
 * hasn't been initialized (non-portal routes, non-production, or no DSN)
 * so this never forces the ~420KB chunk to load on marketing pages.
 */
export async function setSentryUser(userId: string | null): Promise<void> {
  if (!dsn || !isProduction) return;
  // If init is already in flight (or about to start on a portal route),
  // wait for it so setUser lands on an initialized client instead of a
  // no-op / racing against Sentry.init.
  if (!initPromise) {
    if (!userId) return; // nothing to clear if we never initialized
    maybeInitSentry();
  }
  await initPromise;
  const Sentry = await import('@sentry/nextjs');
  Sentry.setUser(userId ? { id: userId } : null);
}
