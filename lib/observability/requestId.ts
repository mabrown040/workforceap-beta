/**
 * Request ID plumbing for observability.
 *
 * Every request entering the system is tagged with an `x-request-id`:
 *  - If a trusted upstream (e.g. Vercel edge, an external load balancer)
 *    already set the header we forward it verbatim. Otherwise we mint a
 *    fresh `crypto.randomUUID()` and inject it on the request.
 *
 *  - The header is forwarded into every server context (server components,
 *    route handlers, Prisma callsites) so that:
 *      * structured logs (`lib/observability/logger.ts`) include it,
 *      * Sentry events get tagged with it via `sentry.{server,edge}.config.ts`,
 *      * `MemberEvent` rows persisted by `trackEvent` carry it for later
 *        join-with-logs forensics.
 *
 * Naming: the canonical header is `x-request-id`. Some upstreams use
 * `request-id` / `x-correlation-id`; we accept those as fallbacks but
 * always emit `x-request-id` downstream.
 */

import { AsyncLocalStorage } from 'async_hooks';

/** Canonical request-ID header name. */
export const REQUEST_ID_HEADER = 'x-request-id';

const FALLBACK_REQUEST_ID_HEADERS = ['request-id', 'x-correlation-id'] as const;

/** Maximum length we will trust from an upstream-supplied header. */
const MAX_REQUEST_ID_LENGTH = 200;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;

const requestIdStorage = new AsyncLocalStorage<string>();

/**
 * Extract a request ID from an incoming `Headers` object, or mint a new one.
 * Returns an object with the resolved ID and whether it was newly minted.
 */
export function resolveRequestId(headers: Headers | { get(name: string): string | null }): {
  requestId: string;
  generated: boolean;
} {
  for (const name of [REQUEST_ID_HEADER, ...FALLBACK_REQUEST_ID_HEADERS]) {
    const raw = headers.get(name);
    if (!raw) continue;
    const trimmed = raw.trim();
    if (
      trimmed.length === 0 ||
      trimmed.length > MAX_REQUEST_ID_LENGTH ||
      !REQUEST_ID_PATTERN.test(trimmed)
    ) {
      continue;
    }
    return { requestId: trimmed, generated: false };
  }
  return { requestId: cryptoRandomUUID(), generated: true };
}

/**
 * Wrap `fn` so that anything inside its async call stack can read the
 * current request ID via `getRequestId()`. Used by the API route helpers
 * that already wrap handlers (auth, GUC) — additive only.
 */
export function runWithRequestId<T>(requestId: string, fn: () => T | Promise<T>): T | Promise<T> {
  return requestIdStorage.run(requestId, fn);
}

/** Read the request ID for the current async scope (undefined outside a request). */
export function getRequestId(): string | undefined {
  return requestIdStorage.getStore();
}

/**
 * Read the request ID from a `Headers`-like (e.g. from `next/headers`)
 * without requiring an active `AsyncLocalStorage` scope. Falls back to
 * `getRequestId()` and finally to `undefined`.
 */
export function readRequestIdFromHeaders(
  headers: Headers | { get(name: string): string | null } | null | undefined,
): string | undefined {
  if (!headers) return getRequestId();
  for (const name of [REQUEST_ID_HEADER, ...FALLBACK_REQUEST_ID_HEADERS]) {
    const raw = headers.get(name);
    if (raw && raw.trim().length > 0) return raw.trim();
  }
  return getRequestId();
}

function cryptoRandomUUID(): string {
  // Edge + Node 19+ both have globalThis.crypto.randomUUID. Fall back to a
  // best-effort manual UUID if the runtime lacks it (should not happen on
  // Next.js 14+).
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  // Manual v4 fallback. Not cryptographically strong but acceptable for
  // request correlation.
  return 'rid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
