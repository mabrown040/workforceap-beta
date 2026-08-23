export type OrgBranding = {
  primaryColor: string | null;
  logo: string | null;
};

/**
 * Process-local org branding cache (custom-domain / non-default org).
 *
 * Default-org branding already uses `unstable_cache` (1h). Custom-domain
 * requests set `x-wap-org-id` and used to Prisma-read on every HTML render.
 * This Map covers the same isolate the way `customDomainCache` covers hosts;
 * `getRequestOrgBranding` also wraps the loader in `unstable_cache`.
 *
 * TTL matches the default-org data cache (1 hour).
 */
export const ORG_BRANDING_CACHE_TTL_SECONDS = 3600;
export const ORG_BRANDING_CACHE_TTL_MS = ORG_BRANDING_CACHE_TTL_SECONDS * 1000;

type Entry = {
  value: OrgBranding;
  expiresAt: number;
};

const cache = new Map<string, Entry>();

export function getCachedOrgBranding(orgId: string, now = Date.now()): OrgBranding | null {
  const entry = cache.get(orgId);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(orgId);
    return null;
  }
  return entry.value;
}

export function setCachedOrgBranding(
  orgId: string,
  value: OrgBranding,
  now = Date.now(),
  ttlMs = ORG_BRANDING_CACHE_TTL_MS,
): void {
  cache.set(orgId, { value, expiresAt: now + ttlMs });
}

export function clearOrgBrandingCache(): void {
  cache.clear();
}

/** Load-through cache. `now` is injectable so tests can expire entries without sleeping. */
export async function cachedOrgBranding(
  orgId: string,
  load: () => Promise<OrgBranding>,
  now = Date.now(),
): Promise<OrgBranding> {
  const hit = getCachedOrgBranding(orgId, now);
  if (hit) return hit;
  const value = await load();
  setCachedOrgBranding(orgId, value, now);
  return value;
}
