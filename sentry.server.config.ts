import * as Sentry from '@sentry/nextjs';
import { sentryBeforeSend, sentryBeforeBreadcrumb } from '@/lib/observability/sentryScrubber';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Don't auto-attach IP / cookies / headers to events. AUDIT §H-S7.
  sendDefaultPii: false,
  // Recursively scrub PII keys from request, extras, and breadcrumbs.
  beforeSend: sentryBeforeSend,
  beforeBreadcrumb: sentryBeforeBreadcrumb,
});
