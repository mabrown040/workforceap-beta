import { prisma } from '@/lib/db/prisma';

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

  // ── Member status counts ──
  const [enrolled, active, placed, inactive] = await Promise.all([
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
  ]);

  // ── Enrollment trend (last 6 months) ──
  const enrolledMembers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      enrolledAt: { gte: sixMonthsAgo },
      ...(organizationId ? { organizationId } : {}),
    },
    select: { enrolledAt: true },
  });

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

  // ── Training progress by program ──
  // Pull active members with their program progress rows
  const activeMembers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      memberStatus: 'active',
      ...(organizationId ? { organizationId } : {}),
    },
    select: {
      memberProgramProgress: {
        select: { programSlug: true, averagePercent: true },
      },
    },
  });

  const progMap = new Map<string, { totalPercent: number; count: number }>();
  for (const m of activeMembers) {
    for (const p of m.memberProgramProgress) {
      const cur = progMap.get(p.programSlug) ?? { totalPercent: 0, count: 0 };
      cur.totalPercent += p.averagePercent ?? 0;
      cur.count += 1;
      progMap.set(p.programSlug, cur);
    }
  }
  const programProgress: ProgramProgress[] = [...progMap.entries()].map(([slug, agg]) => ({
    programSlug: slug,
    avgPercent: agg.count > 0 ? Math.round(agg.totalPercent / agg.count) : 0,
    activeMembers: agg.count,
  })).sort((a, b) => b.activeMembers - a.activeMembers);

  // ── Placement rate: placed / (placed + completed-training) ──
  const placedCount = placed;
  // completed-training = members who are certified (memberProgramCompleted logic)
  const completedTrainingMembers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      ...(organizationId ? { organizationId } : {}),
    },
    select: {
      enrolledProgram: true,
      memberProgramProgress: {
        select: { programSlug: true, averagePercent: true, coursesCompleted: true },
      },
    },
  });

  // Use the same helper logic from boardOutcomes for "completed"
  const completedCount = completedTrainingMembers.filter((m) => {
    const prog = m.enrolledProgram;
    if (!prog) return false;
    const row = m.memberProgramProgress.find((p) => p.programSlug === prog);
    if (!row) return false;
    return (row.averagePercent ?? 0) >= 100 || (row.coursesCompleted ?? 0) > 0;
  }).length;

  const placementRateDenominator = placedCount + completedCount;
  const placementRate: PlacementRate = {
    placed: placedCount,
    completedTraining: completedCount,
    rate: placementRateDenominator > 0 ? Math.round((placedCount / placementRateDenominator) * 100) : 0,
  };

  // ── Drop-off: members with staleTrainingDetectedAt set ──
  const dropOffCount = await prisma.user.count({
    where: {
      deletedAt: null,
      staleTrainingDetectedAt: { not: null },
      ...(organizationId ? { organizationId } : {}),
    },
  });

  // ── Counselor load ──
  const assignments = await prisma.counselorAssignment.findMany({
    where: { active: true },
    select: {
      counselorId: true,
      memberId: true,
    },
  });

  const counselorIds = Array.from(new Set(assignments.map((a) => a.counselorId)));
  const counselorUsers = await prisma.user.findMany({
    where: { id: { in: counselorIds } },
    select: { id: true, fullName: true },
  });
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

  // Unassigned = active members not in any active assignment
  const assignedMemberIds = new Set(assignments.map((a) => a.memberId));
  const unassignedCount = await prisma.user.count({
    where: {
      deletedAt: null,
      memberStatus: 'active',
      id: { notIn: [...assignedMemberIds] },
      ...(organizationId ? { organizationId } : {}),
    },
  });

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
