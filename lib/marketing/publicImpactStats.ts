import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { computeTrainingProgress } from '@/lib/member/trainingProgress';
import { getProgramBySlug } from '@/lib/content/programs';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import type { Prisma } from '@prisma/client';

export type ImpactProgramRow = {
  programSlug: string;
  programTitle: string;
  enrolled: number;
  completed: number;
  avgDaysToComplete: number | null;
};

export type PublicImpactStats = {
  membersServed: number;
  completionRatePct: number;
  placementRatePct: number;
  avgSalaryIncreaseDollars: number | null;
  salaryIncreaseSampleSize: number;
  programs: ImpactProgramRow[];
  employersPartnered: number;
  jobsPosted: number;
  hiresMade: number;
  asOfLabel: string;
};

export const EMPTY_PUBLIC_IMPACT_STATS: PublicImpactStats = {
  membersServed: 0,
  completionRatePct: 0,
  placementRatePct: 0,
  avgSalaryIncreaseDollars: null,
  salaryIncreaseSampleSize: 0,
  programs: [],
  employersPartnered: 0,
  jobsPosted: 0,
  hiresMade: 0,
  asOfLabel: 'Impact data unavailable',
};

/** True when at least one public impact metric has recorded activity. */
export function hasPublicImpactLiveData(stats: PublicImpactStats): boolean {
  return (
    stats.membersServed > 0 ||
    stats.programs.length > 0 ||
    stats.employersPartnered > 0 ||
    stats.jobsPosted > 0 ||
    stats.hiresMade > 0
  );
}

/** True when enrolled program cohorts exist for rate calculations. */
export function hasPublicImpactEnrolledCohort(stats: PublicImpactStats): boolean {
  return stats.programs.length > 0;
}

export type PublishedImpactStatRow = {
  label: string;
  value: string;
};

type PublishedImpactJsonLdLabels = {
  membersServed: string;
  completionRate: string;
  placementRate: string;
  avgSalaryIncrease: string;
  employerPartners: string;
  jobsPosted: string;
  hires: string;
};

/** Only metrics that are visibly published on /impact — omit 0% rates and empty cohorts. */
export function buildPublishedImpactJsonLdStats(
  stats: PublicImpactStats,
  labels: PublishedImpactJsonLdLabels,
): PublishedImpactStatRow[] {
  const rows: PublishedImpactStatRow[] = [];

  if (stats.membersServed > 0) {
    rows.push({
      label: labels.membersServed,
      value: stats.membersServed.toLocaleString('en-US'),
    });
  }

  if (hasPublicImpactEnrolledCohort(stats) && stats.completionRatePct > 0) {
    rows.push({
      label: labels.completionRate,
      value: `${stats.completionRatePct}%`,
    });
  }

  if (hasPublicImpactEnrolledCohort(stats) && stats.placementRatePct > 0) {
    rows.push({
      label: labels.placementRate,
      value: `${stats.placementRatePct}%`,
    });
  }

  if (stats.salaryIncreaseSampleSize > 0 && stats.avgSalaryIncreaseDollars != null) {
    rows.push({
      label: labels.avgSalaryIncrease,
      value: `+$${Math.round(stats.avgSalaryIncreaseDollars).toLocaleString('en-US')}`,
    });
  }

  if (stats.employersPartnered > 0) {
    rows.push({
      label: labels.employerPartners,
      value: stats.employersPartnered.toLocaleString('en-US'),
    });
  }

  if (stats.jobsPosted > 0) {
    rows.push({
      label: labels.jobsPosted,
      value: stats.jobsPosted.toLocaleString('en-US'),
    });
  }

  if (stats.hiresMade > 0) {
    rows.push({
      label: labels.hires,
      value: stats.hiresMade.toLocaleString('en-US'),
    });
  }

  return rows;
}

function memberUserWhere(orgId: string): Prisma.UserWhereInput {
  return {
    organizationId: orgId,
    deletedAt: null,
    ...MEMBER_ONLY_WHERE,
  };
}

function completionEndDate(args: {
  programSlug: string;
  isCompleted: boolean;
  memberProgramProgress: { programSlug: string; lastUpdatedAt: Date }[];
  lastCourseCompletedAt: Date | undefined;
}): Date | null {
  if (args.lastCourseCompletedAt) return args.lastCourseCompletedAt;
  if (!args.isCompleted) return null;
  const mpp = args.memberProgramProgress.find((p) => p.programSlug === args.programSlug);
  return mpp?.lastUpdatedAt ?? null;
}

export async function getPublicImpactStats(orgId: string): Promise<PublicImpactStats> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return { ...EMPTY_PUBLIC_IMPACT_STATS, asOfLabel: 'Build mode' };
  }

  try {
    const memberWhere = memberUserWhere(orgId);
    const jobPostedStatuses = ['approved', 'live', 'filled', 'closed'] as const;

    const [
      membersServed,
      enrolledUsers,
      employersPartnered,
      jobsPosted,
      hiresMade,
      salaryDeltas,
    ] = await Promise.all([
      prisma.user.count({ where: memberWhere }),
      prisma.user.findMany({
        take: 5000,
        where: { ...memberWhere, enrolledProgram: { not: null } },
        select: {
          id: true,
          enrolledProgram: true,
          enrolledAt: true,
          createdAt: true,
          coursesCompleted: true,
          memberProgramProgress: {
            select: { programSlug: true, averagePercent: true, coursesCompleted: true, lastUpdatedAt: true },
          },
          placementRecord: { select: { id: true } },
        },
      }),
      prisma.employer.count({ where: { organizationId: orgId, status: 'active' } }),
      prisma.job.count({
        where: { organizationId: orgId, status: { in: [...jobPostedStatuses] } },
      }),
      prisma.placementRecord.count({ where: { user: memberWhere } }),
      prisma.placementRecord.findMany({
        take: 5000,
        where: {
          salaryOffered: { not: null },
          wageAtFollowUp: { not: null },
          user: memberWhere,
        },
        select: { salaryOffered: true, wageAtFollowUp: true },
      }),
    ]);

    const userIds = enrolledUsers.map((u) => u.id);
    const lastCompletedAtByUserProgram = new Map<string, Date>();

    if (userIds.length) {
      const cps = await prisma.courseProgress.findMany({
        take: 5000,
        where: {
          userId: { in: userIds },
          status: 'COMPLETED',
          completedAt: { not: null },
        },
        select: { userId: true, programSlug: true, completedAt: true },
      });
      for (const row of cps) {
        const k = `${row.userId}\0${row.programSlug}`;
        const at = row.completedAt!;
        const prev = lastCompletedAtByUserProgram.get(k);
        if (!prev || at > prev) lastCompletedAtByUserProgram.set(k, at);
      }
    }

    const enrolledDenominator = enrolledUsers.length;
    let completedForRate = 0;
    let placedForRate = 0;

    type ProgramAgg = { enrolled: number; completed: number; daySum: number; dayCount: number };
    const bySlug = new Map<string, ProgramAgg>();

    for (const u of enrolledUsers) {
      const slug = u.enrolledProgram!;
      let agg = bySlug.get(slug);
      if (!agg) {
        agg = { enrolled: 0, completed: 0, daySum: 0, dayCount: 0 };
        bySlug.set(slug, agg);
      }
      agg.enrolled += 1;

      const progress = computeTrainingProgress(slug, u.coursesCompleted, u.memberProgramProgress);
      const isCompleted =
        progress.totalCourses > 0 &&
        (progress.pct >= 100 || progress.completedCount >= progress.totalCourses);

      if (isCompleted) {
        completedForRate += 1;
        agg.completed += 1;
        const k = `${u.id}\0${slug}`;
        const lastCp = lastCompletedAtByUserProgram.get(k);
        const endAt = completionEndDate({
          programSlug: slug,
          isCompleted,
          memberProgramProgress: u.memberProgramProgress,
          lastCourseCompletedAt: lastCp,
        });
        const startAt = u.enrolledAt ?? u.createdAt;
        if (endAt && startAt && endAt >= startAt) {
          const days = (endAt.getTime() - startAt.getTime()) / 86400000;
          agg.daySum += days;
          agg.dayCount += 1;
        }
      }

      if (u.placementRecord) placedForRate += 1;
    }

    const completionRatePct =
      enrolledDenominator > 0 ? Math.round((completedForRate / enrolledDenominator) * 100) : 0;
    const placementRatePct =
      enrolledDenominator > 0 ? Math.round((placedForRate / enrolledDenominator) * 100) : 0;

    let avgSalaryIncreaseDollars: number | null = null;
    if (salaryDeltas.length > 0) {
      const sum = salaryDeltas.reduce((s, r) => s + (r.wageAtFollowUp! - r.salaryOffered!), 0);
      avgSalaryIncreaseDollars = sum / salaryDeltas.length;
    }

    const programRows: ImpactProgramRow[] = [...bySlug.keys()]
      .sort((a, b) => {
        const titleA = getProgramBySlug(a)?.title ?? a;
        const titleB = getProgramBySlug(b)?.title ?? b;
        return titleA.localeCompare(titleB);
      })
      .map((programSlug) => {
        const agg = bySlug.get(programSlug)!;
        const avgDaysToComplete = agg.dayCount > 0 ? agg.daySum / agg.dayCount : null;
        return {
          programSlug,
          programTitle: getProgramBySlug(programSlug)?.title ?? programSlug,
          enrolled: agg.enrolled,
          completed: agg.completed,
          avgDaysToComplete,
        };
      });

    const asOf = new Date();
    const asOfLabel = `Figures reflect live data in WorkforceAP · ${asOf.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;

    return {
      membersServed,
      completionRatePct,
      placementRatePct,
      avgSalaryIncreaseDollars,
      salaryIncreaseSampleSize: salaryDeltas.length,
      programs: programRows,
      employersPartnered,
      jobsPosted,
      hiresMade,
      asOfLabel,
    };
  } catch {
    return EMPTY_PUBLIC_IMPACT_STATS;
  }
}
