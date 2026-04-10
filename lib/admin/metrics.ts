import { prisma } from '@/lib/db/prisma';

/** Generate daily activity for the last N days */
async function getDailyActivity(days: number): Promise<{ date: string; events: number; aiTools: number; applications: number }[]> {
  const result: { date: string; events: number; aiTools: number; applications: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const [events, aiTools, applications] = await Promise.all([
      prisma.memberEvent.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.aIToolResult.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.jobApplication.count({ where: { createdAt: { gte: start, lte: end }, status: { not: 'SAVED' } } }),
    ]);
    result.push({ date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), events, aiTools, applications });
  }
  return result;
}

/** Get program enrollment breakdown */
async function getEnrollmentByProgram(): Promise<{ program: string; count: number }[]> {
  const rows = await prisma.user.groupBy({
    by: ['enrolledProgram'],
    where: { enrolledProgram: { not: null }, deletedAt: null },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });
  return rows.map(r => ({ program: r.enrolledProgram ?? 'Unknown', count: r._count.id }));
}

/** Get placement rate: members with a placement record / total enrolled */
async function getPlacementStats() {
  const [enrolled, placed, certifications] = await Promise.all([
    prisma.user.count({ where: { enrolledProgram: { not: null }, deletedAt: null } }),
    prisma.placementRecord.count(),
    prisma.userCertification.count(),
  ]);
  return { enrolled, placed, certifications, placementRate: enrolled > 0 ? Math.round((placed / enrolled) * 100) : 0 };
}

export async function getAdminMetrics() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    totalMembers,
    activeUserIds7d,
    activeUserIds14d,
    goalsCount,
    applicationsCount,
    resourceCompletions,
    aiToolUsage,
    pathwayStarts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.goal.count({ where: { status: 'ACTIVE' } }),
    prisma.jobApplication.count({ where: { status: { not: 'SAVED' } } }),
    prisma.resourceProgress.count({ where: { completedAt: { not: null } } }),
    prisma.aIToolResult.count(),
    prisma.learningProgress.count(),
  ]);

  const active14dSet = new Set(activeUserIds14d.map((x) => x.userId));
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const inactiveUserIds = allUsers.filter((u) => !active14dSet.has(u.id)).map((u) => u.id);

  // Parallel fetch for charts (non-blocking for basic metrics)
  const [dailyActivity, enrollmentByProgram, placementStats] = await Promise.all([
    getDailyActivity(14),
    getEnrollmentByProgram(),
    getPlacementStats(),
  ]);

  return {
    totalMembers,
    weeklyActiveMembers: activeUserIds7d.length,
    inactive14Days: inactiveUserIds.length,
    activeGoals: goalsCount,
    applicationsSubmitted: applicationsCount,
    resourcesCompleted: resourceCompletions,
    aiToolRuns: aiToolUsage,
    pathwayStarts,
    inactiveUserIds: inactiveUserIds.slice(0, 50),
    // Chart data
    dailyActivity,
    enrollmentByProgram,
    placementStats,
  };
}
