/**
 * In-memory readiness probe cache. Lives outside `route.ts` so Next.js
 * generated route types do not see a non-handler export (`__resetReadyCache`).
 */

export const CACHE_TTL_MS = 5000;

export type ReadyCacheEntry = {
  body: unknown;
  status: number;
  headers: Record<string, string>;
  until: number;
};

export const readyCache: { current: ReadyCacheEntry | null } = { current: null };

/** Test-only: clear the in-memory ready cache. */
export function __resetReadyCache() {
  readyCache.current = null;
}
