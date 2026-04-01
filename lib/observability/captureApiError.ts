import * as Sentry from '@sentry/nextjs';

/**
 * Log and report API route failures. Sentry captures in production when SENTRY_DSN is set
 * (see sentry.server.config.ts); otherwise this is a structured console.error only.
 */
export function captureApiError(
  err: unknown,
  context: { route: string; extra?: Record<string, unknown> }
): void {
  const error =
    err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  console.error(`[${context.route}]`, error);
  Sentry.captureException(error, {
    tags: { api_route: context.route },
    extra: context.extra,
  });
}
