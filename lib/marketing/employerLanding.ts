import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { getPublicImpactStats, EMPTY_PUBLIC_IMPACT_STATS } from '@/lib/marketing/publicImpactStats';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';

/**
 * Primary CTA for /employers hero — pipeline subscription LOI flow.
 * Falls back to contact form if Stripe is not configured.
 */
export function getEmployerHiringPartnerCtaHref(): string {
  // Pipeline subscription is the hero offer; send to LOI form
  return '/employers/signup';
}

export function isEmployerHiringPartnerCtaExternal(): boolean {
  return false;
}

export type EmployerTrustLogo = {
  companyName: string;
  logoUrl: string | null;
};

export type EmployerLandingTrustMetrics = {
  membersPlaced: number;
  avgStartingWage: number | null;
  partnerCompanies: number;
  logos: EmployerTrustLogo[];
  asOfLabel: string;
  hasLiveData: boolean;
};

/** Fallback strings when a live metric is unavailable mid-render (not shown on the placeholder strip). */
const PLACEHOLDER_TRUST = {
  membersPlacedLabel: '—',
  avgStartingWageLabel: '—',
  partnerCompaniesLabel: '—',
} as const;

// Public employer marketing should not imply a partner-company network until
// WorkforceAP has real external partner companies it is comfortable naming or counting.
const PUBLIC_PARTNER_COMPANIES_ENABLED = false;

export function formatEmployerTrustStat(
  liveValue: number | null,
  placeholder: string,
  format?: (n: number) => string,
): string {
  if (liveValue != null && liveValue > 0) {
    return format ? format(liveValue) : String(liveValue);
  }
  return placeholder;
}

export function getEmployerTrustPlaceholders() {
  return PLACEHOLDER_TRUST;
}

export async function getEmployerLandingTrustMetrics(
  orgId: string,
  db: PrismaClient = prisma,
): Promise<EmployerLandingTrustMetrics> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return {
      membersPlaced: 0,
      avgStartingWage: null,
      partnerCompanies: 0,
      logos: [],
      asOfLabel: 'Build mode',
      hasLiveData: false,
    };
  }

  try {
    const memberWhere = {
      organizationId: orgId,
      deletedAt: null,
      ...MEMBER_ONLY_WHERE,
    };

    const [impact, avgStarting, logosRaw] = await Promise.all([
      getPublicImpactStats(orgId),
      db.placementRecord.aggregate({
        where: { salaryOffered: { not: null }, user: memberWhere },
        _avg: { salaryOffered: true },
      }),
      db.employer.findMany({
        where: {
          organizationId: orgId,
          status: 'active',
          logoUrl: { not: null },
        },
        select: { companyName: true, logoUrl: true },
        take: 8,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const logos: EmployerTrustLogo[] = logosRaw.map((e) => ({
      companyName: e.companyName,
      logoUrl: resolveSupabasePublicAssetUrl('employer-logos', e.logoUrl),
    }));

    const membersPlaced = impact.hiresMade;
    const partnerCompanies = PUBLIC_PARTNER_COMPANIES_ENABLED ? impact.employersPartnered : 0;
    const avgStartingWage =
      avgStarting._avg.salaryOffered != null ? Math.round(avgStarting._avg.salaryOffered) : null;

    const hasLiveData = membersPlaced > 0 || avgStartingWage != null || logos.length > 0;

    return {
      membersPlaced,
      avgStartingWage,
      partnerCompanies,
      logos,
      asOfLabel: impact.asOfLabel,
      hasLiveData,
    };
  } catch {
    return {
      membersPlaced: EMPTY_PUBLIC_IMPACT_STATS.hiresMade,
      avgStartingWage: null,
      partnerCompanies: EMPTY_PUBLIC_IMPACT_STATS.employersPartnered,
      logos: [],
      asOfLabel: EMPTY_PUBLIC_IMPACT_STATS.asOfLabel,
      hasLiveData: false,
    };
  }
}

export async function loadEmployerLandingTrustMetrics(): Promise<EmployerLandingTrustMetrics> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return getEmployerLandingTrustMetrics('build');
  }
  try {
    const orgId = await getDefaultOrganizationId();
    return getEmployerLandingTrustMetrics(orgId);
  } catch {
    return {
      membersPlaced: 0,
      avgStartingWage: null,
      partnerCompanies: 0,
      logos: [],
      asOfLabel: 'Outcomes data unavailable',
      hasLiveData: false,
    };
  }
}
