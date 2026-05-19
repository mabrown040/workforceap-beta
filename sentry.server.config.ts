import * as Sentry from '@sentry/nextjs';
import { sentryBeforeSend, sentryBeforeBreadcrumb } from '@/lib/observability/sentryScrubber';
import { getRequestId } from '@/lib/observability/requestId';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Don't auto-attach IP / cookies / headers to events. AUDIT §H-S7.
  sendDefaultPii: false,
  // Recursively scrub PII keys from request, extras, and breadcrumbs, then
  // stamp the current `x-request-id` so each event is correlatable with
  // structured logs and `MemberEvent` rows.
  beforeSend(event, hint) {
    const scrubbed = sentryBeforeSend ? sentryBeforeSend(event, hint) : event;
    if (!scrubbed || typeof (scrubbed as PromiseLike<unknown>).then === 'function') {
      return scrubbed;
    }
    const ev = scrubbed as typeof event;
    const rid = getRequestId();
    if (rid) {
      ev.tags = { ...(ev.tags ?? {}), request_id: rid };
    }
    return ev;
  },
  beforeBreadcrumb: sentryBeforeBreadcrumb,
});
