import { prisma } from '@/lib/db/prisma';

export type MemberEngagementSignals = {
  hasResume: boolean;
  jobApplicationCount: number;
  counselorUnreadCount: number;
  weeklyRecapUnopened: boolean;
  lastLoginAt: Date | null;
};

/**
 * Lightweight counts for dashboard “next best action” nudges (member portal).
 */
export async function getMemberEngagementSignals(userId: string): Promise<MemberEngagementSignals> {
  const { getWeekBounds } = await import('@/lib/recap/generate');
  const { start: thisWeekStart } = getWeekBounds(new Date());

  const [jobApplicationCount, profile, thread, weekRecap, user] = await Promise.all([
    prisma.jobApplication.count({ where: { userId } }),
    prisma.profile.findUnique({
      where: { userId },
      select: { resumeOriginalPath: true, resumeEnhancedPath: true },
    }),
    prisma.messageThread.findUnique({
      where: { memberId: userId },
      select: { id: true, memberLastReadAt: true },
    }),
    prisma.weeklyRecap.findUnique({
      where: { userId_weekStartDate: { userId, weekStartDate: thisWeekStart } },
      select: { openedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    }),
  ]);

  const hasResume = !!(profile?.resumeOriginalPath || profile?.resumeEnhancedPath);

  let counselorUnreadCount = 0;
  if (thread) {
    counselorUnreadCount = await prisma.message.count({
      where: {
        threadId: thread.id,
        authorId: { not: userId },
        ...(thread.memberLastReadAt ? { createdAt: { gt: thread.memberLastReadAt } } : {}),
      },
    });
  }

  const weeklyRecapUnopened = !!(weekRecap && !weekRecap.openedAt);

  return {
    hasResume,
    jobApplicationCount,
    counselorUnreadCount,
    weeklyRecapUnopened,
    lastLoginAt: user?.lastLoginAt ?? null,
  };
}
