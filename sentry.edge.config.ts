import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.05,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
