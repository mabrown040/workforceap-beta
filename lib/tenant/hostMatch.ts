/**
 * Pure host-string utilities for custom-domain → organization resolution.
 *
 * Used by both Edge middleware and Node-runtime resolvers. Must have NO
 * dependencies on Prisma, Node-only modules, or env access — Edge-safe.
 */

/** Hosts treated as the canonical/default WorkforceAP tenant (no org override). */
const CANONICAL_HOST_SUFFIXES = [
  'workforceap.org',
  'workforceap.com',
  'vercel.app',
] as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Normalize a Host header value:
 *  - lowercased
 *  - port stripped (`aaul.workforceap.org:3000` → `aaul.workforceap.org`)
 *  - bracketed IPv6 stripped
 *  - trailing dot stripped
 *  - trimmed
 *
 * Returns `null` if the input is empty/unusable.
 */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let host = raw.trim().toLowerCase();
  if (!host) return null;

  // IPv6 in brackets: [::1]:3000
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end > 0) host = host.slice(1, end);
  } else {
    // Strip :port
    const colon = host.lastIndexOf(':');
    if (colon > -1) host = host.slice(0, colon);
  }

  // Trailing dot (FQDN form)
  if (host.endsWith('.')) host = host.slice(0, -1);

  return host || null;
}

/**
 * True if this host should NOT trigger custom-domain resolution.
 * Covers the canonical apex/subdomains, vercel preview URLs, and local dev.
 *
 * NOTE: Subdomains under workforceap.org (e.g. `aaul.workforceap.org`)
 * ARE valid custom-domain candidates — they are NOT canonical. Only the
 * apex `workforceap.org` and `www.workforceap.org` are canonical.
 */
export function isCanonicalHost(host: string | null): boolean {
  if (!host) return true;
  if (LOCAL_HOSTS.has(host)) return true;

  // Apex + www only — leave room for tenant subdomains like `aaul.workforceap.org`.
  if (host === 'workforceap.org' || host === 'www.workforceap.org') return true;
  if (host === 'workforceap.com' || host === 'www.workforceap.com') return true;

  // Any *.vercel.app preview deployment is canonical (no tenant override).
  for (const suffix of CANONICAL_HOST_SUFFIXES) {
    if (suffix === 'vercel.app' && host.endsWith('.vercel.app')) return true;
  }

  return false;
}
