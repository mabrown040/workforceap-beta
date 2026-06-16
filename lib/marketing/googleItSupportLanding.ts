import 'server-only';

import type { PrismaClient } from '@prisma/client';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

export const GOOGLE_IT_LANDING_SLUG = 'google-it-support';

export const GOOGLE_IT_PROGRAM_SLUGS = [
  'google-it-support',
  'google-it-support-professional-certificate',
  'it-support-professional-certificate-google',
  'it-support-professional-certificate-ibm',
  'it-support-and-entry-level-cyber-security-certificate',
  'comptia-a-professional-certificate',
] as const;

export const GOOGLE_IT_PRIMARY_HANDOFF_PROGRAM_SLUG = 'it-support-professional-certificate-ibm';

export const GOOGLE_IT_COMPLETION_RATE_MIN_ENROLLMENTS = 10;
export const GOOGLE_IT_PLACEMENT_RATE_MIN_ENROLLMENTS = 40;

export type GoogleItLandingMetrics = {
  enrollmentCount: number;
  completionCount: number;
  placementCount: number;
  hasLiveData: boolean;
  asOfLabel: string;
};

export type GoogleItPublicMetricCard = {
  key: 'enrollment' | 'completion' | 'placement';
  label: string;
  value: string;
  detail: string;
};

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function buildGoogleItPublicMetricCards(metrics: GoogleItLandingMetrics): GoogleItPublicMetricCard[] {
  if (!metrics.hasLiveData || metrics.enrollmentCount <= 0) return [];

  const cards: GoogleItPublicMetricCard[] = [
    {
      key: 'enrollment',
      label: 'Current enrollments',
      value: metrics.enrollmentCount.toLocaleString('en-US'),
      detail: 'Learners enrolled in the IT support pathway.',
    },
  ];

  if (metrics.enrollmentCount >= GOOGLE_IT_COMPLETION_RATE_MIN_ENROLLMENTS) {
    cards.push({
      key: 'completion',
      label: 'Completion rate',
      value: formatPercent(metrics.completionCount, metrics.enrollmentCount),
      detail: 'Members with completed program progress divided by enrollments.',
    });
  }

  if (metrics.enrollmentCount >= GOOGLE_IT_PLACEMENT_RATE_MIN_ENROLLMENTS) {
    cards.push({
      key: 'placement',
      label: 'Placement rate',
      value: formatPercent(metrics.placementCount, metrics.enrollmentCount),
      detail: 'Verified placement records divided by enrollments.',
    });
  }

  return cards;
}

function unavailableMetrics(asOfLabel = 'No reliable program outcomes available yet'): GoogleItLandingMetrics {
  return {
    enrollmentCount: 0,
    completionCount: 0,
    placementCount: 0,
    hasLiveData: false,
    asOfLabel,
  };
}

export async function getGoogleItLandingMetrics(
  orgId: string,
  db: PrismaClient = prisma,
): Promise<GoogleItLandingMetrics> {
  if (shouldSkipOptionalDbQueriesAtBuild()) return unavailableMetrics('Build mode');

  try {
    const enrolledWhere = {
      organizationId: orgId,
      programSlug: { in: [...GOOGLE_IT_PROGRAM_SLUGS] },
    };
    const memberWhere = {
      organizationId: orgId,
      deletedAt: null,
      ...MEMBER_ONLY_WHERE,
    };

    const [enrollmentCount, completionCount, placementCount] = await Promise.all([
      db.courseEnrollment.count({ where: enrolledWhere }),
      db.memberProgramProgress.count({
        where: {
          programSlug: { in: [...GOOGLE_IT_PROGRAM_SLUGS] },
          averagePercent: { gte: 100 },
          user: memberWhere,
        },
      }),
      db.placementRecord.count({
        where: {
          user: memberWhere,
          OR: [
            { programSlug: { in: [...GOOGLE_IT_PROGRAM_SLUGS] } },
            { user: { courseEnrollments: { some: { programSlug: { in: [...GOOGLE_IT_PROGRAM_SLUGS] } } } } },
          ],
        },
      }),
    ]);

    return {
      enrollmentCount,
      completionCount,
      placementCount,
      hasLiveData: enrollmentCount > 0,
      asOfLabel: 'Live WorkforceAP program data; rates shown only after minimum sample thresholds are met.',
    };
  } catch {
    return unavailableMetrics('Outcomes data unavailable');
  }
}

export async function loadGoogleItLandingMetrics(): Promise<GoogleItLandingMetrics> {
  if (shouldSkipOptionalDbQueriesAtBuild()) return unavailableMetrics('Build mode');

  try {
    const orgId = await getDefaultOrganizationId();
    return getGoogleItLandingMetrics(orgId);
  } catch {
    return unavailableMetrics('Outcomes data unavailable');
  }
}
