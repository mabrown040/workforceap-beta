import * as Sentry from '@sentry/nextjs';
import { sentryBeforeSend, sentryBeforeBreadcrumb } from '@/lib/observability/sentryScrubber';
import { getRequestId } from '@/lib/observability/requestId';
import { getGucContext } from '@/lib/db/gucContext';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn) && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.05,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
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
    // Tag the event with the authenticated user's ID (ID ONLY — never email,
    // name, or other PII). Sentry.setUser() is unsafe here: this is a
    // serverless/edge runtime, so module-scope global state can leak across
    // concurrent invocations. Instead, read the userId already threaded
    // per-request through gucContextStorage (see lib/db/gucContext.ts,
    // populated by app/layout.tsx and withApiGuc/withAuthGuc) — same
    // AsyncLocalStorage pattern as getRequestId() above.
    if (!ev.user?.id) {
      const gucUserId = getGucContext()?.userId;
      if (gucUserId) {
        ev.user = { ...(ev.user ?? {}), id: gucUserId };
      }
    }
    return ev;
  },
  beforeBreadcrumb: sentryBeforeBreadcrumb,
});
