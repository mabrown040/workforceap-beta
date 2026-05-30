export type HealthCacheEntry = {
  body: unknown;
  status: number;
  headers: Record<string, string>;
  until: number;
};

/** In-memory health-check response cache (module-private mutable holder). */
export const healthCache: { current: HealthCacheEntry | null } = { current: null };

/** Test-only: clear the in-memory health cache. */
export function __resetHealthCache() {
  healthCache.current = null;
}
