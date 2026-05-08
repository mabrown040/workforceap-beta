// NOTE: intentionally NOT `import 'server-only'` — this module is unit
// tested directly via `node --test`, and the `server-only` shim is a
// Next.js bundler-time guard that throws under node --test. The helper
// only does work if a fetcher is invoked (defaults branch is pure),
// and the default fetcher pulls in `@/lib/db/prisma` which is itself
// node-only. That is sufficient runtime protection.

import { prisma } from '@/lib/db/prisma';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { DEFAULT_BRAND_ACCENT } from '@/lib/platform/brandColors';

/**
 * Track E — Email Branding Parameterization (Sprint E.1 PR 2)
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/WHITE-LABEL.md`.
 *
 * `getOrganizationBranding(orgId)` is the single source of truth for the
 * brand metadata threaded into transactional emails (and any other
 * org-aware presentation surface). It returns the org's name, logo URL,
 * accent color, support email, and canonical domain — falling back to
 * WorkforceAP defaults for any field the org has not configured.
 *
 * Why a helper (not a direct `prisma.organization.findUnique`):
 *   - Email-send hot paths (job approve, invite blast, weekly digest)
 *     would otherwise hit the DB on every send. A 60s TTL in-memory
 *     cache turns 1000 emails/min into 1 query/min per org.
 *   - Centralizes fallback logic so a new email template can't forget
 *     to handle a null `logo` or invalid `primaryColor` hex.
 *   - When the schema gains explicit `supportEmail` / `senderEmail`
 *     columns, only this helper changes — every template stays put.
 *
 * Cache strategy:
 *   - Module-scope `Map<orgId, { value, expiresAt }>`.
 *   - 60s TTL chosen as the same window admins typically wait between
 *     a logo upload and a "send test email" — long enough to absorb
 *     bursts, short enough to feel live.
 *   - `clearOrganizationBrandingCache(orgId?)` lets the admin settings
 *     route invalidate after a write. Tests use it for isolation.
 */

export type OrganizationBranding = {
  /** Stable org id; undefined when the helper resolved fallback defaults. */
  orgId: string | null;
  /** Org display name, e.g. "Workforce Advancement Project" or "AAUL". */
  name: string;
  /** Public HTTPS URL of the org's logo, ready to embed in an `<img src>`. */
  logoUrl: string;
  /** Validated `#RRGGBB` hex used for header gradient + CTA button. */
  primaryColor: string;
  /** Reply-to / "questions" email shown in copy and footer. */
  supportEmail: string;
  /** Canonical site origin (no trailing slash) used for CTA hrefs and footers. */
  domain: string;
  /** Hostname without protocol, used for plain-text footer links. */
  domainLabel: string;
};

const DEFAULT_LOGO_PATH = '/images/wap_logo.png';
const DEFAULT_NAME = 'Workforce Advancement Project';
const DEFAULT_SUPPORT_EMAIL_FALLBACK = 'info@workforceap.org';
const DEFAULT_DOMAIN_FALLBACK = 'https://www.workforceap.org';

const CACHE_TTL_MS = 60 * 1000;

type CacheEntry = { value: OrganizationBranding; expiresAt: number };
const cache = new Map<string, CacheEntry>();

/** Shape of the org row this helper consumes. Exported for test fakes. */
export type OrganizationBrandingRow = {
  id: string;
  name: string;
  logo: string | null;
  primaryColor: string | null;
  customDomain: string | null;
};

/**
 * Default fetcher: reads the org row from Prisma. Tests inject a fake.
 * The contract is "return null if missing"; throws are caught upstream
 * and degrade to defaults.
 */
type OrgRowFetcher = (orgId: string) => Promise<OrganizationBrandingRow | null>;

const defaultFetcher: OrgRowFetcher = async (orgId) => {
  const row = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      logo: true,
      primaryColor: true,
      customDomain: true,
    },
  });
  return row;
};

function getDefaultDomain(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_DOMAIN_FALLBACK).trim();
  // Strip trailing slash so callers can do `${domain}/path` safely.
  return raw.replace(/\/+$/, '');
}

function getDefaultSupportEmail(): string {
  return (process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL_FALLBACK).trim();
}

function toDomainLabel(domain: string): string {
  try {
    return new URL(domain).host;
  } catch {
    return domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }
}

function toAbsoluteDomain(customDomain: string): string {
  const trimmed = customDomain.trim().replace(/\/+$/, '');
  if (!trimmed) return getDefaultDomain();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function validHex(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : null;
}

function defaultBranding(): OrganizationBranding {
  const domain = getDefaultDomain();
  return {
    orgId: null,
    name: DEFAULT_NAME,
    logoUrl: `${domain}${DEFAULT_LOGO_PATH}`,
    primaryColor: DEFAULT_BRAND_ACCENT,
    supportEmail: getDefaultSupportEmail(),
    domain,
    domainLabel: toDomainLabel(domain),
  };
}

/**
 * Resolve the branding bundle for `orgId`, falling back to WorkforceAP
 * defaults for any null/empty field. Returns the default bundle when
 * `orgId` is empty or the lookup misses.
 *
 * Safe to call from any server context (route handlers, crons, after()).
 * Never throws — failures degrade to defaults so a transient DB blip
 * cannot block an outgoing email.
 */
export async function getOrganizationBranding(
  orgId: string | null | undefined,
  options: { fetcher?: OrgRowFetcher } = {},
): Promise<OrganizationBranding> {
  if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
    return defaultBranding();
  }

  const cached = cache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const fetcher = options.fetcher ?? defaultFetcher;
  const defaults = defaultBranding();
  let branding: OrganizationBranding = defaults;
  try {
    const org = await fetcher(orgId);
    if (org) {
      const resolvedDomain = org.customDomain
        ? toAbsoluteDomain(org.customDomain)
        : defaults.domain;
      const logoPublicUrl = resolveSupabasePublicAssetUrl(
        'organization-branding',
        org.logo ?? null,
      );
      branding = {
        orgId: org.id,
        name: org.name?.trim() || defaults.name,
        logoUrl: logoPublicUrl ?? defaults.logoUrl,
        primaryColor: validHex(org.primaryColor) ?? defaults.primaryColor,
        // Schema does not yet carry per-org support/sender email columns
        // (verified against prisma/schema.prisma 2026-05-08). Fall back to
        // the env-driven default until E.1 PR N adds the field.
        supportEmail: defaults.supportEmail,
        domain: resolvedDomain,
        domainLabel: toDomainLabel(resolvedDomain),
      };
    }
  } catch (err) {
    // Build-time, missing DB, transient connection error — log once and
    // serve defaults. Email sends are fire-and-forget; we do not want
    // an org lookup to wedge a downstream Resend call.
    console.warn('[organizationBranding] falling back to defaults:', err);
  }

  cache.set(orgId, { value: branding, expiresAt: Date.now() + CACHE_TTL_MS });
  return branding;
}

/**
 * Invalidate the cache. Call from admin org-settings writes after the
 * org row has been updated so the next email reflects the new logo /
 * color without waiting for the 60s TTL.
 *
 * With no argument, clears every entry (useful in tests).
 */
export function clearOrganizationBrandingCache(orgId?: string): void {
  if (!orgId) {
    cache.clear();
    return;
  }
  cache.delete(orgId);
}

/** Test-only: synchronous default bundle, for snapshot/contains assertions. */
export function getDefaultBrandingForTests(): OrganizationBranding {
  return defaultBranding();
}
