import * as Sentry from '@sentry/nextjs';
import { getGucContext } from '@/lib/db/gucContext';

/**
 * Log and report API route failures. Sentry captures in production when SENTRY_DSN is set
 * (see sentry.server.config.ts); otherwise this is a structured console.error only.
 */
export function captureApiError(
  err: unknown,
  context: { route: string; extra?: Record<string, unknown>; userId?: string | null }
): void {
  const error =
    err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  console.error(`[${context.route}]`, error);
  // Tag with the authenticated user's ID only (never email/name/other PII).
  // Prefer an explicit `context.userId` from the caller; fall back to the
  // per-request GUC context (AsyncLocalStorage) populated by withApiGuc /
  // withAuthGuc / the root layout — same fallback sentry.server.config.ts /
  // sentry.edge.config.ts apply in beforeSend, kept here too as defense in
  // depth since this call site already has the exception + route in scope.
  const userId = context.userId ?? getGucContext()?.userId ?? undefined;
  Sentry.captureException(error, {
    tags: { api_route: context.route },
    extra: context.extra,
    user: userId ? { id: userId } : undefined,
  });
}
