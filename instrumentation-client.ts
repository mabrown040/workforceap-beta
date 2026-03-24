import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

/** Required by @sentry/nextjs for App Router navigation tracing. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
