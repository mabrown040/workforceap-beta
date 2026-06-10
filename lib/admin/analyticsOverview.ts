import 'server-only';

import { FundingSource } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadTrainingDashboardData } from '@/lib/admin/trainingDashboard';
import { calculateHealthStatus, type HealthStatus } from '@/lib/admin/healthScore';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type AnalyticsFunnel = {
  totalMembers: number;
  enrolledInProgram: number;
  activeInTraining: number;
  completed: number;
};

export type AnalyticsEngagement = {
  active: number;
  atRisk: number;
  inactive: number;
  notStarted: number;
  stalled: number;
};

export type AnalyticsOutcomes = {
  placements: number;
  pendingPlacements: number;
  completedTraining: number;
  /** placements / completed-training, 0–100 (null when no completers). */
  placementRatePct: number | null;
};

export type AnalyticsFundingRow = {
  source: string;
  label: string;
  count: number;
};

export type AnalyticsProgramRow = {
  slug: string;
  title: string;
  count: number;
};

export type AnalyticsOverview = {
  funnel: AnalyticsFunnel;
  engagement: AnalyticsEngagement;
  outcomes: AnalyticsOutcomes;
  funding: AnalyticsFundingRow[];
  programs: AnalyticsProgramRow[];
};

const FUNDING_LABELS: Record<FundingSource, string> = {
  [FundingSource.GRANT]: 'Grant',
  [FundingSource.EMPLOYER]: 'Employer-sponsored',
  [FundingSource.PARTNER_ORG]: 'Partner organization',
  [FundingSource.SELF]: 'Self-funded',
  [FundingSource.OTHER]: 'Other',
};

/**
 * Single fast read for the admin analytics overview page. Reuses the existing
 * training dashboard aggregate for funnel/engagement and runs lightweight
 * prisma count/groupBy queries (no per-member N+1) for everything else. Every
 * slice is settled independently so one failing query degrades to zero rather
 * than blanking the page.
 */
export async function loadAnalyticsOverview(): Promise<AnalyticsOverview> {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    trainingResult,
    totalMembersResult,
    lastEventsResult,
    recentEventsResult,
    membersForHealthResult,
    placementsResult,
    pendingPlacementsResult,
    fundingResult,
    programResult,
  ] = await Promise.allSettled([
    loadTrainingDashboardData(),
    prisma.user.count({ where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE } }),
    prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _max: { createdAt: true },
    }),
    prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE, enrolledProgram: { not: null } },
      take: 5000,
      select: { id: true, enrolledAt: true },
    }),
    prisma.placementRecord.count({
      where: { user: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE } },
    }),
    // Member-confirmed placements still awaiting counselor verification.
    prisma.placementRecord.count({
      where: { startDateVerified: false, user: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE } },
    }),
    prisma.courseEnrollment.groupBy({
      by: ['fundingSource'],
      _count: { _all: true },
    }),
    prisma.courseEnrollment.groupBy({
      by: ['programSlug'],
      _count: { _all: true },
    }),
  ]);

  // ── Funnel + engagement (reuse the training dashboard aggregate) ──
  const training = trainingResult.status === 'fulfilled' ? trainingResult.value : null;
  const metrics = training?.metrics ?? {
    enrolledMembers: 0,
    activeInTraining: 0,
    notStarted: 0,
    completed: 0,
    stale: 0,
    averagePercent: 0,
  };

  const totalMembers = totalMembersResult.status === 'fulfilled' ? totalMembersResult.value : 0;

  const funnel: AnalyticsFunnel = {
    totalMembers,
    enrolledInProgram: metrics.enrolledMembers,
    activeInTraining: metrics.activeInTraining,
    completed: metrics.completed,
  };

  // ── Risk via the shared health-score helper over enrolled members ──
  const lastEventMap = new Map<string, Date | null>();
  if (lastEventsResult.status === 'fulfilled') {
    for (const row of lastEventsResult.value) lastEventMap.set(row.userId, row._max.createdAt);
  }
  const recentEventMap = new Map<string, number>();
  if (recentEventsResult.status === 'fulfilled') {
    for (const row of recentEventsResult.value) recentEventMap.set(row.userId, row._count._all);
  }

  const healthCounts: Record<HealthStatus, number> = { green: 0, yellow: 0, red: 0 };
  if (membersForHealthResult.status === 'fulfilled') {
    for (const m of membersForHealthResult.value) {
      const status = calculateHealthStatus({
        lastEventAt: lastEventMap.get(m.id) ?? null,
        recentEventCount: recentEventMap.get(m.id) ?? 0,
        enrolledAt: m.enrolledAt,
      });
      healthCounts[status] += 1;
    }
  }

  const engagement: AnalyticsEngagement = {
    active: healthCounts.green,
    atRisk: healthCounts.yellow,
    inactive: healthCounts.red,
    notStarted: metrics.notStarted,
    stalled: metrics.stale,
  };

  // ── Outcomes ──
  const placements = placementsResult.status === 'fulfilled' ? placementsResult.value : 0;
  const pendingPlacements =
    pendingPlacementsResult.status === 'fulfilled' ? pendingPlacementsResult.value : 0;
  const completedTraining = metrics.completed;
  const outcomes: AnalyticsOutcomes = {
    placements,
    pendingPlacements,
    completedTraining,
    placementRatePct:
      completedTraining > 0 ? Math.round((placements / completedTraining) * 100) : null,
  };

  // ── Funding mix ──
  const funding: AnalyticsFundingRow[] = [];
  if (fundingResult.status === 'fulfilled') {
    for (const row of fundingResult.value) {
      const source = row.fundingSource;
      funding.push({
        source: source ?? 'UNSPECIFIED',
        label: source ? FUNDING_LABELS[source] : 'Not specified',
        count: row._count._all,
      });
    }
    funding.sort((a, b) => b.count - a.count);
  }

  // ── Programs (enrollment count per program) ──
  const programs: AnalyticsProgramRow[] = [];
  if (programResult.status === 'fulfilled') {
    for (const row of programResult.value) {
      programs.push({
        slug: row.programSlug,
        title: getProgramBySlug(row.programSlug)?.title ?? row.programSlug,
        count: row._count._all,
      });
    }
    programs.sort((a, b) => b.count - a.count);
  }

  return { funnel, engagement, outcomes, funding, programs };
}
