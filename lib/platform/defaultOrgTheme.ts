import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export type OrgBranding = {
  primaryColor: string | null;
  logo: string | null;
};

const FALLBACK_ACCENT = '#2563eb';

export async function getDefaultOrgBranding(): Promise<OrgBranding> {
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
    return { primaryColor: null, logo: null };
  }
  try {
    const id = await getDefaultOrganizationId();
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { primaryColor: true, logo: true },
    });
    return { primaryColor: org?.primaryColor ?? null, logo: org?.logo ?? null };
  } catch {
    // Build-time / missing DB / missing org row — neutral branding
    return { primaryColor: null, logo: null };
  }
}

/** CSS value for --org-accent (validated hex or fallback). */
export function orgAccentCss(branding: OrgBranding): string {
  const c = branding.primaryColor?.trim();
  if (c && /^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  return FALLBACK_ACCENT;
}
