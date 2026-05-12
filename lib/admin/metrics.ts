import { AIToolType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { CAREER_OS_WORKFLOW } from '@/lib/workflows/careerOS';

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
  // The earlier `toolType: { notIn: EVENT_ONLY_AI_TOOLS }` filter passed
  // strings that aren't valid AIToolType enum members to the Postgres
  // enum column — `invalid input value for enum AIToolType` at runtime,
  // which rejected this entire function and cascaded up to make
  // /admin/metrics charts render empty even when data existed. The
  // filter was also unnecessary: EVENT_ONLY_AI_TOOLS are voice sessions
  // tracked via member_events (entity_type='ai_tool'), they are never
  // stored in ai_tool_results.toolType. So count all ai_tool_results
  // in the window and add the event-only voice counts on top.
  const [savedResults, eventOnlyRuns] = await Promise.all([
    prisma.aIToolResult.count({ where: { createdAt: { gte: start, lte: end } } }),
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

function localCalendarDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isEventOnlyAiToolMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const tool = (metadata as Record<string, unknown>).tool;
  const s = typeof tool === 'string' ? tool : '';
  return (EVENT_ONLY_AI_TOOLS as readonly string[]).includes(s);
}

/** Generate daily activity for the last N days (batched fetches + in-memory bucketing) */
async function getDailyActivity(days: number): Promise<{ date: string; events: number; aiTools: number; applications: number }[]> {
  const now = new Date();
  const ranges = Array.from({ length: days }, (_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1 - i));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayKey: localCalendarDayKey(start),
    };
  });

  const rangeStart = ranges[0].start;
  const rangeEnd = ranges[ranges.length - 1].end;
  const dayKeySet = new Set(ranges.map((r) => r.dayKey));

  const initSeries = () => {
    const m = new Map<string, number>();
    for (const r of ranges) m.set(r.dayKey, 0);
    return m;
  };

  const addTimestampToSeries = (series: Map<string, number>, at: Date) => {
    const key = localCalendarDayKey(at);
    if (!dayKeySet.has(key)) return;
    series.set(key, (series.get(key) ?? 0) + 1);
  };

  // One round-trip: events, AI saved rows, AI event-only rows, applications — replaces 14×3 per-day counts (~42 queries for 14 days).
  const [eventsR, aiSavedR, aiEventsR, applicationsR] = await Promise.allSettled([
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.aIToolResult.findMany({
      where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      select: { createdAt: true },
    }),
    prisma.memberEvent.findMany({
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
        eventName: 'ai_tool_run_started',
        entityType: 'ai_tool',
      },
      select: { createdAt: true, metadata: true },
    }),
    prisma.jobApplication.findMany({
      where: { createdAt: { gte: rangeStart, lte: rangeEnd }, status: { not: 'SAVED' } },
      select: { createdAt: true },
    }),
  ]);

  const eventsByDay = initSeries();
  const aiByDay = initSeries();
  const applicationsByDay = initSeries();

  if (eventsR.status === 'rejected') {
    logMetricsReason('dailyActivity:events:batch', eventsR.reason);
  } else {
    for (const row of eventsR.value) addTimestampToSeries(eventsByDay, row.createdAt);
  }

  if (aiSavedR.status === 'rejected') {
    logMetricsReason('dailyActivity:aiTools:saved:batch', aiSavedR.reason);
  } else {
    for (const row of aiSavedR.value) addTimestampToSeries(aiByDay, row.createdAt);
  }

  if (aiEventsR.status === 'rejected') {
    logMetricsReason('dailyActivity:aiTools:events:batch', aiEventsR.reason);
  } else {
    for (const row of aiEventsR.value) {
      if (isEventOnlyAiToolMetadata(row.metadata)) {
        addTimestampToSeries(aiByDay, row.createdAt);
      }
    }
  }

  if (applicationsR.status === 'rejected') {
    logMetricsReason('dailyActivity:applications:batch', applicationsR.reason);
  } else {
    for (const row of applicationsR.value) addTimestampToSeries(applicationsByDay, row.createdAt);
  }

  return ranges.map(({ date, dayKey }) => ({
    date,
    events: eventsByDay.get(dayKey) ?? 0,
    aiTools: aiByDay.get(dayKey) ?? 0,
    applications: applicationsByDay.get(dayKey) ?? 0,
  }));
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

/** Career OS funnel: completion events received → actions created → real action completion */
async function getCareerOsMetrics() {
  const [completionEventsReceived, actionsCreated, actionsCompletedRows, actionsDismissedRows, actionsPendingRows] = await Promise.all([
    prisma.workflowDiagnostic.count({
      where: { workflow: CAREER_OS_WORKFLOW, status: 'started' },
    }),
    prisma.memberEvent.count({
      where: {
        eventName: 'career_os.learning_completion_processed',
        entityType: 'MemberNextBestAction',
      },
    }),
    prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN member_events source_event
        ON source_event.entity_id = nba.id
      WHERE nba.status = 'COMPLETED'
        AND source_event.event_name = 'career_os.learning_completion_processed'
        AND source_event.entity_type = 'MemberNextBestAction'
    `,
    prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN member_events source_event
        ON source_event.entity_id = nba.id
      WHERE nba.status = 'DISMISSED'
        AND source_event.event_name = 'career_os.learning_completion_processed'
        AND source_event.entity_type = 'MemberNextBestAction'
    `,
    prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN member_events source_event
        ON source_event.entity_id = nba.id
      WHERE nba.status = 'PENDING'
        AND source_event.event_name = 'career_os.learning_completion_processed'
        AND source_event.entity_type = 'MemberNextBestAction'
    `,
  ]);

  const completedCount = actionsCompletedRows[0]?.count ?? 0;
  const dismissedCount = actionsDismissedRows[0]?.count ?? 0;
  const pendingCount = actionsPendingRows[0]?.count ?? 0;
  const actionsCompleted = typeof completedCount === 'bigint' ? Number(completedCount) : completedCount;
  const actionsDismissed = typeof dismissedCount === 'bigint' ? Number(dismissedCount) : dismissedCount;
  const actionsPending = typeof pendingCount === 'bigint' ? Number(pendingCount) : pendingCount;

  const followThroughRate =
    actionsCreated > 0 ? Math.round((actionsCompleted / actionsCreated) * 100) : 0;

  return {
    completionEventsReceived,
    actionsCreated,
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
        completionEventsReceived: 0,
        actionsCreated: 0,
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
