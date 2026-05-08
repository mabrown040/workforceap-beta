/**
 * Process-local cache of `customDomain` (normalized host) → `organizationId`.
 *
 * Edge-runtime safe: pure JavaScript Map + Date.now(), no Node APIs.
 * Lives in module scope so it's shared across requests in the same isolate.
 *
 * The cache is populated by `lib/tenant/resolveOrgFromRequest.ts` (Node
 * runtime) — middleware only READS this cache and forwards `x-wap-host`
 * to downstream when there's a miss. This avoids Prisma calls from Edge.
 *
 * TTL is short (60s) so removed/renamed customDomains stop resolving
 * within a minute without requiring a redeploy.
 */

export const CUSTOM_DOMAIN_CACHE_TTL_MS = 60_000;

/** Sentinel value cached when a host has been confirmed to have NO matching org. */
export const NO_ORG_SENTINEL = '__no_org__';

type Entry = {
  /** organizationId, or NO_ORG_SENTINEL if a lookup confirmed no match. */
  value: string;
  expiresAt: number;
};

const cache = new Map<string, Entry>();

export type CustomDomainCache = {
  get(host: string): string | null;
  set(host: string, orgId: string | null, ttlMs?: number): void;
  delete(host: string): void;
  clear(): void;
  size(): number;
};

function getEntry(host: string, now: number): Entry | null {
  const entry = cache.get(host);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(host);
    return null;
  }
  return entry;
}

export const customDomainCache: CustomDomainCache = {
  /**
   * Return the cached orgId for `host`, or:
   *  - `NO_ORG_SENTINEL` if a previous lookup confirmed no match
   *  - `null` if the entry is missing or expired (caller should resolve)
   */
  get(host) {
    const entry = getEntry(host, Date.now());
    return entry ? entry.value : null;
  },

  /**
   * Cache a resolved host → orgId mapping.
   * Pass `null` to cache a confirmed-no-match (avoids repeated DB hits
   * for unknown hosts during a flood of requests).
   */
  set(host, orgId, ttlMs = CUSTOM_DOMAIN_CACHE_TTL_MS) {
    cache.set(host, {
      value: orgId ?? NO_ORG_SENTINEL,
      expiresAt: Date.now() + ttlMs,
    });
  },

  delete(host) {
    cache.delete(host);
  },

  clear() {
    cache.clear();
  },

  size() {
    return cache.size;
  },
};
