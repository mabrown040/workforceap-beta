import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export type OrgBranding = {
  primaryColor: string | null;
  logo: string | null;
};

export { DEFAULT_BRAND_ACCENT, DEFAULT_BRAND_ACCENT_DARK } from '@/lib/platform/brandColors';

export async function getDefaultOrgBranding(): Promise<OrgBranding> {
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
    // Build-time / missing DB / missing org row — neutral branding
    return { primaryColor: null, logo: null };
  }
}

/** Validated custom accent only; callers that need CSS vars should use OrgBrandingStyle. */
export function orgAccentCss(branding: OrgBranding): string | null {
  const c = branding.primaryColor?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return null;
}
