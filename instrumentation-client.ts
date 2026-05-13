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

let captureRouterTransitionStart: ((href: string, navigationType?: string) => void) | undefined;
let initPromise: Promise<void> | null = null;

async function initSentry() {
  if (!dsn || !isProduction) return;

  const Sentry = await import('@sentry/nextjs');

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
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
  captureRouterTransitionStart?.(href);
};

// Initialize immediately on portal routes (initial page load)
maybeInitSentry();
