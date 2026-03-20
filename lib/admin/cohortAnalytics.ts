import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

const NONE_KEY = '__none__';

export function cohortLabel(enrolledProgram: string | null): string {
  if (!enrolledProgram) return 'Not enrolled';
  const p = getProgramBySlug(enrolledProgram);
  return p?.title ?? enrolledProgram;
}

function userIdsByCohort(
  users: Array<{ id: string; enrolledProgram: string | null }>
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const u of users) {
    const key = u.enrolledProgram ?? NONE_KEY;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(u.id);
  }
  return map;
}

export type WeeklyRecapCohortRow = {
  cohortKey: string;
  cohortLabel: string;
  memberCount: number;
  membersWithRecap: number;
  totalRecaps: number;
  recapsLast7Days: number;
  avgReadinessScore: number | null;
};

export async function getWeeklyRecapCohortStats(): Promise<WeeklyRecapCohortRow[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const recaps = await prisma.weeklyRecap.findMany({
    select: {
      userId: true,
      generatedAt: true,
      readinessScoreSnapshot: true,
    },
  });

  const rows: WeeklyRecapCohortRow[] = [];

  for (const [cohortKey, ids] of byCohort) {
    const memberCount = ids.size;
    const cohortRecaps = recaps.filter((r) => ids.has(r.userId));
    const membersWithRecap = new Set(cohortRecaps.map((r) => r.userId)).size;
    const recapsLast7Days = cohortRecaps.filter((r) => r.generatedAt >= sevenDaysAgo).length;
    const withScore = cohortRecaps.filter((r) => r.readinessScoreSnapshot != null);
    const avgReadinessScore =
      withScore.length > 0
        ? Math.round(
            withScore.reduce((s, r) => s + (r.readinessScoreSnapshot ?? 0), 0) / withScore.length
          )
        : null;

    rows.push({
      cohortKey,
      cohortLabel: cohortLabel(cohortKey === NONE_KEY ? null : cohortKey),
      memberCount,
      membersWithRecap,
      totalRecaps: cohortRecaps.length,
      recapsLast7Days,
      avgReadinessScore,
    });
  }

  rows.sort((a, b) => b.memberCount - a.memberCount);
  return rows;
}

export type AiToolsCohortRow = {
  cohortKey: string;
  cohortLabel: string;
  memberCount: number;
  totalRuns: number;
  runsLast7Days: number;
  membersUsedTools: number;
};

export async function getAiToolsCohortStats(): Promise<AiToolsCohortRow[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const runs = await prisma.aIToolResult.findMany({
    select: { userId: true, createdAt: true },
  });

  const rows: AiToolsCohortRow[] = [];

  for (const [cohortKey, ids] of byCohort) {
    const memberCount = ids.size;
    const cohortRuns = runs.filter((r) => ids.has(r.userId));
    const runsLast7Days = cohortRuns.filter((r) => r.createdAt >= sevenDaysAgo).length;
    const membersUsedTools = new Set(cohortRuns.map((r) => r.userId)).size;

    rows.push({
      cohortKey,
      cohortLabel: cohortLabel(cohortKey === NONE_KEY ? null : cohortKey),
      memberCount,
      totalRuns: cohortRuns.length,
      runsLast7Days,
      membersUsedTools,
    });
  }

  rows.sort((a, b) => b.totalRuns - a.totalRuns);
  return rows;
}

export type CertificationsCohortRow = {
  cohortKey: string;
  cohortLabel: string;
  memberCount: number;
  totalCerts: number;
  membersWithCert: number;
};

export async function getCertificationsCohortStats(): Promise<CertificationsCohortRow[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const certs = await prisma.userCertification.findMany({
    select: { userId: true },
  });

  const rows: CertificationsCohortRow[] = [];

  for (const [cohortKey, ids] of byCohort) {
    const memberCount = ids.size;
    const cohortCerts = certs.filter((c) => ids.has(c.userId));
    const membersWithCert = new Set(cohortCerts.map((c) => c.userId)).size;

    rows.push({
      cohortKey,
      cohortLabel: cohortLabel(cohortKey === NONE_KEY ? null : cohortKey),
      memberCount,
      totalCerts: cohortCerts.length,
      membersWithCert,
    });
  }

  rows.sort((a, b) => b.totalCerts - a.totalCerts);
  return rows;
}
