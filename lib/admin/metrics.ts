import { prisma } from '@/lib/db/prisma';

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
  };
}
