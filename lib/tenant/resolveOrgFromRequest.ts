/**
 * Resolve the active organization for an incoming request.
 *
 * This is the Node-runtime counterpart to the Edge middleware in
 * `middleware.ts`. The middleware sets two request headers:
 *
 *   - `x-wap-org-id`   → present when middleware found a cached customDomain hit.
 *   - `x-wap-host`     → the normalized Host header (always set when usable).
 *
 * Server components and API routes call `resolveOrgFromRequest()` to get
 * the active orgId. If the header is already present, we trust it. If
 * not, we look up `customDomain` in Prisma (Node runtime, can hit DB)
 * and populate the in-process cache so subsequent middleware invocations
 * resolve the host without a DB round-trip.
 *
 * Backward compatibility: when no customDomain matches, this falls back
 * to `getDefaultOrganizationId()` so existing single-tenant code paths
 * keep working unchanged.
 */

import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import {
  customDomainCache,
  NO_ORG_SENTINEL,
  type CustomDomainCache,
} from '@/lib/tenant/customDomainCache';
import { isCanonicalHost, normalizeHost } from '@/lib/tenant/hostMatch';

export const WAP_ORG_ID_HEADER = 'x-wap-org-id';
export const WAP_HOST_HEADER = 'x-wap-host';

/** Minimal shape of `headers()` / `Request.headers` we accept. */
export type HeadersLike = {
  get(name: string): string | null;
};

/**
 * Database lookup hook — overridable for tests so we don't need to mock
 * the entire Prisma client. Production uses the real prisma instance.
 */
export type CustomDomainLookup = (host: string) => Promise<string | null>;

const defaultLookup: CustomDomainLookup = async (host) => {
  try {
    const row = await prisma.organization.findUnique({
      where: { customDomain: host },
      select: { id: true, active: true },
    });
    if (!row || !row.active) return null;
    return row.id;
  } catch {
    // DB unavailable / build-time / missing migration — treat as no-match.
    return null;
  }
};

export type ResolveOptions = {
  /** Inject a fake host→org map for tests. */
  lookup?: CustomDomainLookup;
  /** Inject a fake cache for tests. */
  cache?: CustomDomainCache;
  /** Inject a default-org provider for tests. */
  defaultOrgId?: () => Promise<string>;
};

/**
 * Resolve the orgId for a request.
 *
 * Order of resolution:
 *  1. `x-wap-org-id` header (middleware already cached + matched).
 *  2. `x-wap-host` header → cache → DB lookup.
 *  3. Fallback to default org.
 */
export async function resolveOrgFromRequest(
  headers: HeadersLike,
  options: ResolveOptions = {}
): Promise<string> {
  const cache = options.cache ?? customDomainCache;
  const lookup = options.lookup ?? defaultLookup;
  const fallback = options.defaultOrgId ?? getDefaultOrganizationId;

  // 1. Middleware already attached an orgId — trust it ONLY when
  // x-wap-host is also present (proves middleware ran, not client spoofing).
  const directOrgId = headers.get(WAP_ORG_ID_HEADER);
  const hostHeader = headers.get(WAP_HOST_HEADER);
  if (directOrgId && hostHeader) return directOrgId;

  // 2. Try to resolve via the host header set by middleware.
  const host = normalizeHost(headers.get(WAP_HOST_HEADER) ?? headers.get('host'));
  if (host && !isCanonicalHost(host)) {
    const cached = cache.get(host);
    if (cached === NO_ORG_SENTINEL) {
      // Confirmed no match, skip DB.
    } else if (cached) {
      return cached;
    } else {
      const resolved = await lookup(host);
      cache.set(host, resolved);
      if (resolved) return resolved;
    }
  }

  // 3. Default tenant.
  return fallback();
}

/**
 * Lighter helper for callers that need just the orgId-or-null without the
 * default-org fallback (e.g. analytics, logging). Same resolution rules
 * but returns `null` for canonical/unknown hosts.
 */
export async function tryResolveOrgFromRequest(
  headers: HeadersLike,
  options: Omit<ResolveOptions, 'defaultOrgId'> = {}
): Promise<string | null> {
  const cache = options.cache ?? customDomainCache;
  const lookup = options.lookup ?? defaultLookup;

  // 1. Middleware already attached an orgId — trust it ONLY when
  // x-wap-host is also present (proves middleware ran, not client spoofing).
  const directOrgId = headers.get(WAP_ORG_ID_HEADER);
  const hostHeader = headers.get(WAP_HOST_HEADER);
  if (directOrgId && hostHeader) return directOrgId;

  const host = normalizeHost(headers.get(WAP_HOST_HEADER) ?? headers.get('host'));
  if (!host || isCanonicalHost(host)) return null;

  const cached = cache.get(host);
  if (cached === NO_ORG_SENTINEL) return null;
  if (cached) return cached;

  const resolved = await lookup(host);
  cache.set(host, resolved);
  return resolved;
}
