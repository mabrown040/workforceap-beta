import 'server-only';

import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';
import { buildCsv } from '@/lib/csv';
import { getProgramBySlug } from '@/lib/content/programs';
import { THRESHOLDS } from '@/lib/member/atRiskScoring';
import { computeTrainingProgress } from '@/lib/member/trainingProgress';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

const EXPORT_LIMIT = 10_000;

export type FunderProgramSummaryRow = {
  programSlug: string;
  programTitle: string;
  totalEnrolled: number;
  activeLast30d: number;
  completed: number;
  placed: number;
  atRisk: number;
  completionPct: number;
  placementPct: number;
};

/**
 * Aggregates enrollment, engagement, completion, placement, and at-risk counts per
 * enrolled program for grant / funder reporting. Scoped to `orgId` (actor tenant).
 * Uses the same member-only filter as cohort exports (`MEMBER_ONLY_WHERE`).
 */
export async function getFunderProgramSummaryRows(orgId: string): Promise<{
  rows: FunderProgramSummaryRow[];
  truncated: boolean;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [users, activeMembers, atRiskAlerts] = await Promise.all([
    withTenantScope(orgId, (db) =>
      db.user.findMany({
        where: {
          deletedAt: null,
          enrolledProgram: { not: null },
          ...MEMBER_ONLY_WHERE,
        },
        orderBy: { enrolledAt: 'desc' },
        take: EXPORT_LIMIT,
        select: {
          id: true,
          enrolledProgram: true,
          memberProgramProgress: {
            select: { programSlug: true, averagePercent: true, coursesCompleted: true },
          },
          placementRecord: { select: { id: true } },
        },
      }),
    ),
    prisma.memberEvent.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        user: { organizationId: orgId },
      },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.atRiskAlert.findMany({
      where: {
        status: { in: ['open', 'acknowledged'] },
        score: { gte: THRESHOLDS.HIGH },
        user: {
          deletedAt: null,
          enrolledProgram: { not: null },
          organizationId: orgId,
          ...MEMBER_ONLY_WHERE,
        },
      },
      select: {
        userId: true,
        user: { select: { enrolledProgram: true } },
      },
    }),
  ]);

  const active30dSet = new Set(activeMembers.map((r) => r.userId));

  const atRiskByProgram = new Map<string, Set<string>>();
  for (const alert of atRiskAlerts) {
    const slug = alert.user.enrolledProgram;
    if (!slug) continue;
    let set = atRiskByProgram.get(slug);
    if (!set) {
      set = new Set();
      atRiskByProgram.set(slug, set);
    }
    set.add(alert.userId);
  }

  type Agg = {
    totalEnrolled: number;
    activeLast30d: number;
    completed: number;
    placed: number;
  };

  const aggBySlug = new Map<string, Agg>();

  for (const u of users) {
    const slug = u.enrolledProgram!;
    let agg = aggBySlug.get(slug);
    if (!agg) {
      agg = { totalEnrolled: 0, activeLast30d: 0, completed: 0, placed: 0 };
      aggBySlug.set(slug, agg);
    }
    agg.totalEnrolled += 1;
    if (active30dSet.has(u.id)) agg.activeLast30d += 1;

    const progress = computeTrainingProgress(slug, null, u.memberProgramProgress);
    const isCompleted =
      progress.totalCourses > 0 &&
      (progress.pct >= 100 || progress.completedCount >= progress.totalCourses);
    if (isCompleted) agg.completed += 1;

    if (u.placementRecord) agg.placed += 1;
  }

  const rows: FunderProgramSummaryRow[] = [];

  const sortedSlugs = [...aggBySlug.keys()].sort((a, b) => {
    const titleA = getProgramBySlug(a)?.title ?? a;
    const titleB = getProgramBySlug(b)?.title ?? b;
    return titleA.localeCompare(titleB);
  });

  for (const slug of sortedSlugs) {
    const agg = aggBySlug.get(slug)!;
    const atRisk = atRiskByProgram.get(slug)?.size ?? 0;
    const completionPct =
      agg.totalEnrolled > 0 ? Math.round((agg.completed / agg.totalEnrolled) * 100) : 0;
    const placementPct =
      agg.totalEnrolled > 0 ? Math.round((agg.placed / agg.totalEnrolled) * 100) : 0;

    rows.push({
      programSlug: slug,
      programTitle: getProgramBySlug(slug)?.title ?? slug,
      totalEnrolled: agg.totalEnrolled,
      activeLast30d: agg.activeLast30d,
      completed: agg.completed,
      placed: agg.placed,
      atRisk,
      completionPct,
      placementPct,
    });
  }

  return {
    rows,
    truncated: users.length >= EXPORT_LIMIT,
  };
}

const CSV_HEADERS = [
  'Program',
  'Total Enrolled',
  'Active (last 30d)',
  'Completed',
  'Placed',
  'At-Risk',
  'Completion %',
  'Placement %',
] as const;

export function buildFunderProgramSummaryCsv(summaryRows: FunderProgramSummaryRow[]): string {
  const dataRows = summaryRows.map((r) => [
    r.programTitle,
    r.totalEnrolled,
    r.activeLast30d,
    r.completed,
    r.placed,
    r.atRisk,
    `${r.completionPct}%`,
    `${r.placementPct}%`,
  ]);

  return buildCsv([...CSV_HEADERS], dataRows, {
    reportTitle: 'Program outcomes summary (funder / grant)',
    notes:
      'Member-only cohort. Active = any member_events in trailing 30 days. At-risk = open or acknowledged alerts with score >=50 (HIGH threshold). Completed = full curriculum progress for catalog-backed programs.',
  });
}
