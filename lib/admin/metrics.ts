import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

const EVENT_ONLY_AI_TOOLS = [
  'readiness_voice_session',
  'wioa_prequalification_voice_session',
  'employer_voice_session',
  'partner_voice_session',
] as const;

async function countEventOnlyAiRunsBetween(start: Date, end: Date): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "member_events"
    WHERE "created_at" >= ${start}
      AND "created_at" <= ${end}
      AND "event_name" = 'ai_tool_run_started'
      AND "entity_type" = 'ai_tool'
      AND COALESCE(metadata->>'tool', '') IN (${Prisma.join(EVENT_ONLY_AI_TOOLS)})
  `;

  const count = rows[0]?.count ?? 0;
  return typeof count === 'bigint' ? Number(count) : count;
}

async function countAiToolRunsBetween(start: Date, end: Date): Promise<number> {
  const [savedResults, eventOnlyRuns] = await Promise.all([
    prisma.aIToolResult.count({ where: { createdAt: { gte: start, lte: end } } }),
    countEventOnlyAiRunsBetween(start, end),
  ]);

  return savedResults + eventOnlyRuns;
}

/** Generate daily activity for the last N days (all ranges run in parallel) */
async function getDailyActivity(days: number): Promise<{ date: string; events: number; aiTools: number; applications: number }[]> {
  const now = new Date();
  const ranges = Array.from({ length: days }, (_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1 - i));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end, date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  return Promise.all(
    ranges.map(async ({ start, end, date }) => {
      const [events, aiTools, applications] = await Promise.all([
        prisma.memberEvent.count({ where: { createdAt: { gte: start, lte: end } } }),
        countAiToolRunsBetween(start, end),
        prisma.jobApplication.count({ where: { createdAt: { gte: start, lte: end }, status: { not: 'SAVED' } } }),
      ]);
      return { date, events, aiTools, applications };
    })
  );
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

/** Career OS funnel: completions triggered → actions created → member follow-through */
async function getCareerOsMetrics() {
  const [completionsTriggered, actionsGenerated, actionsCompleted, actionsDismissed, actionsPending] = await Promise.all([
    prisma.workflowDiagnostic.count({
      where: { workflow: 'career_os_learning_completion', status: 'started' },
    }),
    prisma.workflowDiagnostic.count({
      where: { workflow: 'career_os_learning_completion', status: 'success' },
    }),
    prisma.memberNextBestAction.count({ where: { icon: 'auto_awesome', status: 'COMPLETED' } }),
    prisma.memberNextBestAction.count({ where: { icon: 'auto_awesome', status: 'DISMISSED' } }),
    prisma.memberNextBestAction.count({ where: { icon: 'auto_awesome', status: 'PENDING' } }),
  ]);

  const followThroughRate =
    actionsGenerated > 0 ? Math.round((actionsCompleted / actionsGenerated) * 100) : 0;

  return {
    completionsTriggered,
    actionsGenerated,
    actionsCompleted,
    actionsDismissed,
    actionsPending,
    followThroughRate,
  };
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
  const aiToolUsagePromise = countAiToolRunsBetween(new Date(0), new Date());

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
    prisma.user.count({ where: { deletedAt: null } }),
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
    aiToolUsagePromise,
    prisma.learningProgress.count(),
  ]);

  const active14dSet = new Set(activeUserIds14d.map((x) => x.userId));
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  const inactiveUserIds = allUsers.filter((u) => !active14dSet.has(u.id)).map((u) => u.id);

  // Parallel fetch for charts + Career OS funnel
  const [dailyActivity, enrollmentByProgram, placementStats, careerOsMetrics] = await Promise.all([
    getDailyActivity(14),
    getEnrollmentByProgram(),
    getPlacementStats(),
    getCareerOsMetrics(),
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
    // Career OS funnel
    careerOsMetrics,
  };
}
