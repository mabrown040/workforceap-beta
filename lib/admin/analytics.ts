import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { validatedProgramCompletionValuesSql } from '@/lib/reporting/programCompletion';

/**
 * Analytics overview for non-technical admin users.
 * Complements the funder-facing BoardSnapshot in boardOutcomes.ts.
 * All numbers are sourced from existing DB data — no new tables.
 */

export type MemberStatusCounts = {
  enrolled: number;
  active: number;
  placed: number;
  inactive: number;
};

export type EnrollmentTrend = {
  month: string; // "2026-01"
  monthLabel: string; // "Jan 2026"
  count: number;
};

export type ProgramProgress = {
  programSlug: string;
  avgPercent: number; // 0–100
  activeMembers: number;
};

export type PlacementRate = {
  placed: number;
  completedTraining: number;
  rate: number; // 0–100
};

export type CounselorLoad = {
  counselorName: string;
  memberCount: number;
};

export type AnalyticsOverview = {
  memberStatus: MemberStatusCounts;
  enrollmentTrend: EnrollmentTrend[];
  programProgress: ProgramProgress[];
  placementRate: PlacementRate;
  dropOffCount: number;
  counselorLoad: CounselorLoad[];
  unassignedCount: number;
};

function monthFmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export async function getAnalyticsOverview(organizationId?: string): Promise<AnalyticsOverview> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const orgFilterSql = organizationId ? Prisma.sql`AND u.organization_id = ${organizationId}` : Prisma.empty;

  // All of the reads below are independent of one another (none consumes
  // another's output), so they run as one Promise.all instead of one
  // sequential round trip at a time. The two full-table-shaped rollups
  // (program progress, completed-training) are also pushed down to
  // Postgres (groupBy / a single joined COUNT) instead of materializing
  // every active/enrolled member's rows and aggregating in JS.
  const [
    enrolled,
    active,
    placed,
    inactive,
    enrolledMembers,
    programProgressGroups,
    completedTrainingCountRows,
    dropOffCount,
    assignments,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        deletedAt: null,
        enrolledProgram: { not: null },
        ...(organizationId ? { organizationId } : {}),
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        memberStatus: 'active',
        ...(organizationId ? { organizationId } : {}),
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        memberStatus: 'placed',
        ...(organizationId ? { organizationId } : {}),
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        memberStatus: 'inactive',
        ...(organizationId ? { organizationId } : {}),
      },
    }),
    // ── Enrollment trend (last 6 months) ──
    prisma.user.findMany({
      where: {
        deletedAt: null,
        enrolledProgram: { not: null },
        enrolledAt: { gte: sixMonthsAgo },
        ...(organizationId ? { organizationId } : {}),
      },
      select: { enrolledAt: true },
    }),
    // ── Training progress by program (active members only) ──
    prisma.memberProgramProgress.groupBy({
      by: ['programSlug'],
      where: {
        user: {
          deletedAt: null,
          memberStatus: 'active',
          ...(organizationId ? { organizationId } : {}),
        },
      },
      _avg: { averagePercent: true },
      _count: { _all: true },
    }),
    // ── Completed-training count: enrolled members whose exact completed
    // course count equals the catalog denominator for their enrolled program.
    prisma.$queryRaw<Array<{ count: number }>>`
      WITH validated_programs(canonical_slug, storage_value, total_courses) AS (
        VALUES ${validatedProgramCompletionValuesSql()}
      )
      SELECT COUNT(DISTINCT u.id)::int AS count
      FROM users u
      INNER JOIN validated_programs enrolled_program
        ON enrolled_program.storage_value = u.enrolled_program
      INNER JOIN member_program_progress mpp
        ON mpp.user_id = u.id
      INNER JOIN validated_programs progress_program
        ON progress_program.canonical_slug = enrolled_program.canonical_slug
        AND progress_program.storage_value = mpp.program_slug
      WHERE u.deleted_at IS NULL
        AND u.enrolled_program IS NOT NULL
        ${orgFilterSql}
        AND mpp.courses_completed = progress_program.total_courses
    `,
    // ── Drop-off: members with staleTrainingDetectedAt set ──
    prisma.user.count({
      where: {
        deletedAt: null,
        staleTrainingDetectedAt: { not: null },
        ...(organizationId ? { organizationId } : {}),
      },
    }),
    // ── Counselor load ──
    prisma.counselorAssignment.findMany({
      where: { active: true },
      select: {
        counselorId: true,
        memberId: true,
      },
    }),
  ]);

  const trendMap = new Map<string, EnrollmentTrend>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = monthFmt(d);
    trendMap.set(m, { month: m, monthLabel: monthLabel(d), count: 0 });
  }
  for (const u of enrolledMembers) {
    if (!u.enrolledAt) continue;
    const m = monthFmt(u.enrolledAt);
    const cur = trendMap.get(m);
    if (cur) cur.count += 1;
  }
  const enrollmentTrend = [...trendMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const programProgress: ProgramProgress[] = programProgressGroups
    .map((g) => ({
      programSlug: g.programSlug,
      avgPercent: g._count._all > 0 ? Math.round(g._avg.averagePercent ?? 0) : 0,
      activeMembers: g._count._all,
    }))
    .sort((a, b) => b.activeMembers - a.activeMembers);

  // ── Placement rate: placed / (placed + completed-training) ──
  const placedCount = placed;
  const completedCount = completedTrainingCountRows[0]?.count ?? 0;

  const placementRateDenominator = placedCount + completedCount;
  const placementRate: PlacementRate = {
    placed: placedCount,
    completedTraining: completedCount,
    rate: placementRateDenominator > 0 ? Math.round((placedCount / placementRateDenominator) * 100) : 0,
  };

  const counselorIds = Array.from(new Set(assignments.map((a) => a.counselorId)));
  const assignedMemberIds = new Set(assignments.map((a) => a.memberId));

  // Counselor name lookup and the unassigned-members count both depend only
  // on `assignments` (already resolved above), not on each other.
  const [counselorUsers, unassignedCount] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: counselorIds } },
      select: { id: true, fullName: true },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        memberStatus: 'active',
        id: { notIn: [...assignedMemberIds] },
        ...(organizationId ? { organizationId } : {}),
      },
    }),
  ]);
  const counselorNameMap = new Map(counselorUsers.map((u) => [u.id, u.fullName ?? 'Unnamed counselor']));

  const counselorMap = new Map<string, { name: string; members: Set<string> }>();
  for (const a of assignments) {
    const name = counselorNameMap.get(a.counselorId) ?? 'Unnamed counselor';
    const cur = counselorMap.get(name) ?? { name, members: new Set<string>() };
    cur.members.add(a.memberId);
    counselorMap.set(name, cur);
  }
  const counselorLoad: CounselorLoad[] = [...counselorMap.values()].map((c) => ({
    counselorName: c.name,
    memberCount: c.members.size,
  })).sort((a, b) => b.memberCount - a.memberCount);

  return {
    memberStatus: { enrolled, active, placed, inactive },
    enrollmentTrend,
    programProgress,
    placementRate,
    dropOffCount,
    counselorLoad,
    unassignedCount,
  };
}
