import { AIToolType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

function logMetricsReason(label: string, reason: unknown) {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const code = reason instanceof Prisma.PrismaClientKnownRequestError ? reason.code : undefined;
  console.error(`[admin/metrics] ${label} failed`, code ?? '(no code)', msg);
}

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
    // Exclude event-only voice tools to avoid double-counting if they ever start saving results
    prisma.aIToolResult.count({ where: { createdAt: { gte: start, lte: end }, toolType: { notIn: EVENT_ONLY_AI_TOOLS as unknown as AIToolType[] } } }),
    countEventOnlyAiRunsBetween(start, end),
  ]);

  return savedResults + eventOnlyRuns;
}

/** Get AI tool usage breakdown by tool type for the given period */
type AiToolBreakdownItem = {
  toolType: AIToolType | typeof EVENT_ONLY_AI_TOOLS[number];
  count: number;
};

async function countSingleEventOnlyTool(tool: string, start: Date, end: Date): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "member_events"
    WHERE "created_at" >= ${start}
      AND "created_at" <= ${end}
      AND "event_name" = 'ai_tool_run_started'
      AND "entity_type" = 'ai_tool'
      AND COALESCE(metadata->>'tool', '') = ${tool}
  `;
  const count = rows[0]?.count ?? 0;
  return typeof count === 'bigint' ? Number(count) : count;
}

async function getAiToolUsageBreakdown(start: Date, end: Date): Promise<AiToolBreakdownItem[]> {
  const [savedBreakdown, voiceCounts] = await Promise.all([
    prisma.aIToolResult.groupBy({
      by: ['toolType'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    Promise.all(
      EVENT_ONLY_AI_TOOLS.map(async (tool) => ({
        toolType: tool as typeof EVENT_ONLY_AI_TOOLS[number],
        count: await countSingleEventOnlyTool(tool, start, end),
      }))
    ),
  ]);

  const breakdown: AiToolBreakdownItem[] = savedBreakdown.map((r) => ({
    toolType: r.toolType,
    count: r._count.id,
  }));

  // Add each event-only voice tool as its own entry for granular reporting
  for (const voice of voiceCounts) {
    if (voice.count > 0) {
      breakdown.push(voice);
    }
  }

  return breakdown.sort((a, b) => b.count - a.count);
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

/** Get AI tool usage stats with trending */
async function getAiToolStats(days: number) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() - days);
  periodStart.setHours(0, 0, 0, 0);

  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - days);

  const [currentPeriodRuns, prevPeriodRuns, totalRuns, breakdown] = await Promise.all([
    countAiToolRunsBetween(periodStart, now),
    countAiToolRunsBetween(prevPeriodStart, periodStart),
    countAiToolRunsBetween(new Date(0), now),
    getAiToolUsageBreakdown(periodStart, now),
  ]);

  const trend = prevPeriodRuns > 0
    ? Math.round(((currentPeriodRuns - prevPeriodRuns) / prevPeriodRuns) * 100)
    : 0;

  return {
    runsLastNDays: currentPeriodRuns,
    trend,
    totalRuns,
    breakdown,
  };
}

export async function getAdminMetrics() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [
    totalMembersResult,
    activeUserIds7dResult,
    activeUserIds14dResult,
    goalsCountResult,
    applicationsCountResult,
    resourceCompletionsResult,
    pathwayStartsResult,
    aiToolStatsResult,
  ] = await Promise.allSettled([
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
    prisma.learningProgress.count(),
    getAiToolStats(7),
  ]);

  if (totalMembersResult.status === 'rejected') logMetricsReason('totalMembers', totalMembersResult.reason);
  if (activeUserIds7dResult.status === 'rejected') logMetricsReason('activeUserIds7d', activeUserIds7dResult.reason);
  if (activeUserIds14dResult.status === 'rejected') logMetricsReason('activeUserIds14d', activeUserIds14dResult.reason);
  if (goalsCountResult.status === 'rejected') logMetricsReason('goalsCount', goalsCountResult.reason);
  if (applicationsCountResult.status === 'rejected') logMetricsReason('applicationsCount', applicationsCountResult.reason);
  if (resourceCompletionsResult.status === 'rejected') logMetricsReason('resourceCompletions', resourceCompletionsResult.reason);
  if (pathwayStartsResult.status === 'rejected') logMetricsReason('pathwayStarts', pathwayStartsResult.reason);
  if (aiToolStatsResult.status === 'rejected') logMetricsReason('aiToolStats', aiToolStatsResult.reason);

  const totalMembers = totalMembersResult.status === 'fulfilled' ? totalMembersResult.value : 0;
  const activeUserIds7d = activeUserIds7dResult.status === 'fulfilled' ? activeUserIds7dResult.value : [];
  const activeUserIds14d = activeUserIds14dResult.status === 'fulfilled' ? activeUserIds14dResult.value : [];
  const goalsCount = goalsCountResult.status === 'fulfilled' ? goalsCountResult.value : 0;
  const applicationsCount = applicationsCountResult.status === 'fulfilled' ? applicationsCountResult.value : 0;
  const resourceCompletions = resourceCompletionsResult.status === 'fulfilled' ? resourceCompletionsResult.value : 0;
  const pathwayStarts = pathwayStartsResult.status === 'fulfilled' ? pathwayStartsResult.value : 0;
  const aiToolStats = aiToolStatsResult.status === 'fulfilled'
    ? aiToolStatsResult.value
    : { runsLastNDays: 0, trend: 0, totalRuns: 0, breakdown: [] };

  const active14dSet = new Set(activeUserIds14d.map((x) => x.userId));

  const allUsersResult = await prisma.user.findMany({ select: { id: true } })
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch((reason) => ({ status: 'rejected' as const, reason }));

  if (allUsersResult.status === 'rejected') {
    logMetricsReason('allUsers', allUsersResult.reason);
  }

  const inactiveUserIds = allUsersResult.status === 'fulfilled'
    ? allUsersResult.value.filter((u) => !active14dSet.has(u.id)).map((u) => u.id)
    : [];

  // Parallel fetch for charts + Career OS funnel
  const [dailyActivityResult, enrollmentByProgramResult, placementStatsResult, careerOsMetricsResult] = await Promise.allSettled([
    getDailyActivity(14),
    getEnrollmentByProgram(),
    getPlacementStats(),
    getCareerOsMetrics(),
  ]);

  if (dailyActivityResult.status === 'rejected') logMetricsReason('dailyActivity', dailyActivityResult.reason);
  if (enrollmentByProgramResult.status === 'rejected') logMetricsReason('enrollmentByProgram', enrollmentByProgramResult.reason);
  if (placementStatsResult.status === 'rejected') logMetricsReason('placementStats', placementStatsResult.reason);
  if (careerOsMetricsResult.status === 'rejected') logMetricsReason('careerOsMetrics', careerOsMetricsResult.reason);

  const dailyActivity = dailyActivityResult.status === 'fulfilled' ? dailyActivityResult.value : [];
  const enrollmentByProgram = enrollmentByProgramResult.status === 'fulfilled' ? enrollmentByProgramResult.value : [];
  const placementStats = placementStatsResult.status === 'fulfilled'
    ? placementStatsResult.value
    : { enrolled: 0, placed: 0, certifications: 0, placementRate: 0 };
  const careerOsMetrics = careerOsMetricsResult.status === 'fulfilled'
    ? careerOsMetricsResult.value
    : {
        completionsTriggered: 0,
        actionsGenerated: 0,
        actionsCompleted: 0,
        actionsDismissed: 0,
        actionsPending: 0,
        followThroughRate: 0,
      };

  return {
    totalMembers,
    weeklyActiveMembers: activeUserIds7d.length,
    inactive14Days: inactiveUserIds.length,
    activeGoals: goalsCount,
    applicationsSubmitted: applicationsCount,
    resourcesCompleted: resourceCompletions,
    aiToolRuns: aiToolStats.totalRuns,
    aiToolStats,
    pathwayStarts,
    inactiveUserIds: inactiveUserIds.slice(0, 50),
    dailyActivity,
    enrollmentByProgram,
    placementStats,
    careerOsMetrics,
  };
}
