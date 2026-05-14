import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export type OrgBranding = {
  primaryColor: string | null;
  logo: string | null;
};

export { DEFAULT_BRAND_ACCENT, DEFAULT_BRAND_ACCENT_DARK } from '@/lib/platform/brandColors';

async function loadDefaultOrgBranding(): Promise<OrgBranding> {
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1' || shouldSkipOptionalDbQueriesAtBuild()) {
    return { primaryColor: null, logo: null };
  }
  try {
    const id = await getDefaultOrganizationId();
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { primaryColor: true, logo: true },
    });
    return {
      primaryColor: org?.primaryColor ?? null,
      logo: resolveSupabasePublicAssetUrl('organization-branding', org?.logo ?? null),
    };
  } catch {
    return { primaryColor: null, logo: null };
  }
}

/** Cached 1h to avoid a Prisma read on every root layout render. */
export const getDefaultOrgBranding = unstable_cache(
  loadDefaultOrgBranding,
  ['default-org-branding'],
  { revalidate: 3600 },
);

/**
 * Resolve org branding for the current request. Honors the `x-wap-org-id`
 * header set by middleware on custom-domain / subdomain hits; falls back to
 * the default org branding for canonical hosts.
 */
export async function getRequestOrgBranding(
  headers: { get(name: string): string | null },
): Promise<OrgBranding> {
  const orgId = headers.get('x-wap-org-id');
  if (!orgId) return getDefaultOrgBranding();
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1' || shouldSkipOptionalDbQueriesAtBuild()) {
    return { primaryColor: null, logo: null };
  }
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { primaryColor: true, logo: true },
    });
    return {
      primaryColor: org?.primaryColor ?? null,
      logo: resolveSupabasePublicAssetUrl('organization-branding', org?.logo ?? null),
    };
  } catch {
    return { primaryColor: null, logo: null };
  }
}

/** Validated custom accent only; callers that need CSS vars should use OrgBrandingStyle. */
export function orgAccentCss(branding: OrgBranding): string | null {
  const c = branding.primaryColor?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return null;
}
