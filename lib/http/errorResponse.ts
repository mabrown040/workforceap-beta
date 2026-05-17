import { NextResponse } from 'next/server';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * Generic JSON error response that never echoes raw upstream error text
 * to the client. The API-response-disclosure audit flagged ~10 routes
 * returning `error: error.message` (Prisma column names, Supabase
 * provider-specific phrasing, internal stack hints) directly to
 * authenticated users.
 *
 * Usage:
 *   } catch (err) {
 *     return apiError(err, { route: 'member/applications', status: 500 });
 *   }
 *
 * Logs the real error to Sentry via `captureApiError` with optional
 * `extra` context, then returns a safe response body containing only
 * a generic message. The original error is never serialized into the
 * response body — even in development.
 */
export function apiError(
  err: unknown,
  args: {
    /** Route name for Sentry tagging (e.g. "member/applications"). */
    route: string;
    /** HTTP status. Default 500. Use 4xx when appropriate. */
    status?: number;
    /** Override the safe message shown to the client. */
    message?: string;
    /** Extra context for Sentry. NEVER include raw user PII (email, phone). */
    extra?: Record<string, unknown>;
  }
): NextResponse {
  const status = args.status ?? 500;
  captureApiError(err, { route: args.route, extra: args.extra });
  const fallback = status >= 500 ? 'Internal server error' : 'Request failed';
  return NextResponse.json({ error: args.message ?? fallback }, { status });
}

/**
 * Like `apiError` but for routes that want to confirm a known
 * client-facing failure shape (e.g. validation, conflict) without
 * leaking the upstream error.
 */
export function safeBadRequest(
  message: string,
  args?: { route?: string; err?: unknown; extra?: Record<string, unknown> }
): NextResponse {
  if (args?.err && args?.route) {
    captureApiError(args.err, { route: args.route, extra: args.extra });
  }
  return NextResponse.json({ error: message }, { status: 400 });
}
