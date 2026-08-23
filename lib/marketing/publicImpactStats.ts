import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { ANALYTICS_COHORT_DETAIL_CAP } from '@/lib/db/scanCaps';
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
      enrolledCount,
      placedAmongEnrolled,
      completedAmongEnrolled,
      enrolledUsers,
      employersPartnered,
      jobsPosted,
      hiresMade,
      salaryDeltas,
    ] = await Promise.all([
      prisma.user.count({ where: memberWhere }),
      prisma.user.count({ where: { ...memberWhere, enrolledProgram: { not: null } } }),
      prisma.user.count({
        where: { ...memberWhere, enrolledProgram: { not: null }, placementRecord: { isNot: null } },
      }),
      prisma.memberProgramProgress.count({
        where: { averagePercent: { gte: 100 }, user: { ...memberWhere, enrolledProgram: { not: null } } },
      }),
      prisma.user.findMany({
        take: ANALYTICS_COHORT_DETAIL_CAP,
        orderBy: { enrolledAt: 'desc' },
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
      prisma.$queryRaw<Array<{ avg_delta: number | null; n: bigint | number }>>`
        SELECT AVG(pr.wage_at_follow_up - pr.salary_offered) AS avg_delta, COUNT(*)::bigint AS n
        FROM placement_records pr
        INNER JOIN users u ON u.id = pr.user_id
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE pr.salary_offered IS NOT NULL
          AND pr.wage_at_follow_up IS NOT NULL
          AND u.organization_id = ${orgId}
          AND u.deleted_at IS NULL
          AND p.role = 'member'
          AND u.email NOT IN ('member.success@workforceap.org', 'mbrown@hsconglomerates.com')
      `,
    ]);

    const userIds = enrolledUsers.map((u) => u.id);
    const lastCompletedAtByUserProgram = new Map<string, Date>();

    if (userIds.length) {
      const cps = await prisma.courseProgress.findMany({
        take: ANALYTICS_COHORT_DETAIL_CAP,
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

    const enrolledDenominator = enrolledCount;
    const completedForRate = completedAmongEnrolled;
    const placedForRate = placedAmongEnrolled;

    type ProgramAgg = { enrolled: number; completed: number; daySum: number; dayCount: number };
    const bySlug = new Map<string, ProgramAgg>();

    const [enrolledByProgram, completedByProgram] = await Promise.all([
      prisma.user.groupBy({
        by: ['enrolledProgram'],
        where: { ...memberWhere, enrolledProgram: { not: null } },
        _count: { _all: true },
      }),
      prisma.memberProgramProgress.groupBy({
        by: ['programSlug'],
        where: { averagePercent: { gte: 100 }, user: { ...memberWhere, enrolledProgram: { not: null } } },
        _count: { _all: true },
      }),
    ]);
    for (const row of enrolledByProgram) {
      if (!row.enrolledProgram) continue;
      bySlug.set(row.enrolledProgram, {
        enrolled: row._count._all,
        completed: 0,
        daySum: 0,
        dayCount: 0,
      });
    }
    for (const row of completedByProgram) {
      const cur = bySlug.get(row.programSlug) ?? { enrolled: 0, completed: 0, daySum: 0, dayCount: 0 };
      cur.completed = row._count._all;
      bySlug.set(row.programSlug, cur);
    }

    for (const u of enrolledUsers) {
      const slug = u.enrolledProgram!;
      const agg = bySlug.get(slug) ?? { enrolled: 0, completed: 0, daySum: 0, dayCount: 0 };
      const progress = computeTrainingProgress(slug, u.coursesCompleted, u.memberProgramProgress);
      const isCompleted =
        progress.totalCourses > 0 &&
        (progress.pct >= 100 || progress.completedCount >= progress.totalCourses);
      if (!isCompleted) continue;
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
        bySlug.set(slug, agg);
      }
    }

    const completionRatePct =
      enrolledDenominator > 0 ? Math.round((completedForRate / enrolledDenominator) * 100) : 0;
    const placementRatePct =
      enrolledDenominator > 0 ? Math.round((placedForRate / enrolledDenominator) * 100) : 0;

    const salaryIncreaseSampleSize = Number(salaryDeltas[0]?.n ?? 0);
    const avgSalaryIncreaseDollars =
      salaryIncreaseSampleSize > 0 && salaryDeltas[0]?.avg_delta != null
        ? Number(salaryDeltas[0].avg_delta)
        : null;

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
      salaryIncreaseSampleSize,
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
