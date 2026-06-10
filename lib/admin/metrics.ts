import { AIToolType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { CAREER_OS_WORKFLOW } from '@/lib/workflows/careerOS';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getCacheOrFetch } from '@/lib/cache';

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

/** FK-scoped models: always pair tenant id with `user: { organizationId }`. */
function memberInOrg(orgId: string) {
  return { user: { organizationId: orgId } };
}

async function countEventOnlyAiRunsBetween(orgId: string, start: Date, end: Date): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "member_events" me
    INNER JOIN "users" u ON u.id = me.user_id AND u.organization_id = ${orgId}
    WHERE me.created_at >= ${start}
      AND me.created_at <= ${end}
      AND me.event_name = 'ai_tool_run_started'
      AND me.entity_type = 'ai_tool'
      AND COALESCE(me.metadata->>'tool', '') IN (${Prisma.join(EVENT_ONLY_AI_TOOLS)})
  `;

  const count = rows[0]?.count ?? 0;
  return typeof count === 'bigint' ? Number(count) : count;
}

async function countAiToolRunsBetween(orgId: string, start: Date, end: Date): Promise<number> {
  const [savedResults, eventOnlyRuns] = await Promise.all([
    prisma.aIToolResult.count({
      where: { createdAt: { gte: start, lte: end }, user: { organizationId: orgId } },
    }),
    countEventOnlyAiRunsBetween(orgId, start, end),
  ]);

  return savedResults + eventOnlyRuns;
}

/** Get AI tool usage breakdown by tool type for the given period */
type AiToolBreakdownItem = {
  toolType: AIToolType | typeof EVENT_ONLY_AI_TOOLS[number];
  count: number;
};

async function countSingleEventOnlyTool(
  orgId: string,
  tool: string,
  start: Date,
  end: Date,
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "member_events" me
    INNER JOIN "users" u ON u.id = me.user_id AND u.organization_id = ${orgId}
    WHERE me.created_at >= ${start}
      AND me.created_at <= ${end}
      AND me.event_name = 'ai_tool_run_started'
      AND me.entity_type = 'ai_tool'
      AND COALESCE(me.metadata->>'tool', '') = ${tool}
  `;
  const count = rows[0]?.count ?? 0;
  return typeof count === 'bigint' ? Number(count) : count;
}

async function getAiToolUsageBreakdown(
  orgId: string,
  start: Date,
  end: Date,
): Promise<AiToolBreakdownItem[]> {
  const [savedBreakdown, voiceCounts] = await Promise.all([
    prisma.aIToolResult.groupBy({
      by: ['toolType'],
      where: { createdAt: { gte: start, lte: end }, user: { organizationId: orgId } },
      _count: { id: true },
    }),
    Promise.all(
      EVENT_ONLY_AI_TOOLS.map(async (tool) => ({
        toolType: tool as typeof EVENT_ONLY_AI_TOOLS[number],
        count: await countSingleEventOnlyTool(orgId, tool, start, end),
      }))
    ),
  ]);

  const breakdown: AiToolBreakdownItem[] = savedBreakdown.map((r) => ({
    toolType: r.toolType,
    count: r._count.id,
  }));

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
async function getDailyActivity(
  orgId: string,
  days: number,
): Promise<{ date: string; events: number; aiTools: number; applications: number }[]> {
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
  const userScope = memberInOrg(orgId);

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

  const [eventsR, aiSavedR, aiEventsR, applicationsR] = await Promise.allSettled([
    prisma.memberEvent.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: { createdAt: { gte: rangeStart, lte: rangeEnd }, ...userScope },
      select: { createdAt: true },
    }),
    prisma.aIToolResult.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: { createdAt: { gte: rangeStart, lte: rangeEnd }, ...userScope },
      select: { createdAt: true },
    }),
    prisma.memberEvent.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
        eventName: 'ai_tool_run_started',
        entityType: 'ai_tool',
        ...userScope,
      },
      select: { createdAt: true, metadata: true },
    }),
    prisma.jobApplication.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: {
        createdAt: { gte: rangeStart, lte: rangeEnd },
        status: { not: 'SAVED' },
        ...userScope,
      },
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
async function getEnrollmentByProgram(orgId: string): Promise<{ program: string; count: number }[]> {
  const rows = await withTenantScope(orgId, (db) =>
    db.user.groupBy({
      by: ['enrolledProgram'],
      where: { enrolledProgram: { not: null }, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
  );
  return rows.map((r) => ({ program: r.enrolledProgram ?? 'Unknown', count: r._count.id }));
}

/** Career OS funnel: completion events received → actions created → real action completion */
async function getCareerOsMetrics(orgId: string) {
  const userScope = memberInOrg(orgId);
  const [completionEventsReceived, actionsCreated, actionsCompletedRows, actionsDismissedRows, actionsPendingRows] =
    await Promise.all([
      prisma.workflowDiagnostic.count({
        where: {
          workflow: CAREER_OS_WORKFLOW,
          status: 'started',
          actorUserId: { not: null },
          actor: { organizationId: orgId },
        },
      }),
      prisma.memberEvent.count({
        where: {
          eventName: 'career_os.learning_completion_processed',
          entityType: 'MemberNextBestAction',
          ...userScope,
        },
      }),
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN users u_scope ON u_scope.id = nba.member_id AND u_scope.organization_id = ${orgId}
      INNER JOIN member_events source_event
        ON source_event.entity_id = nba.id
      WHERE nba.status = 'COMPLETED'
        AND source_event.event_name = 'career_os.learning_completion_processed'
        AND source_event.entity_type = 'MemberNextBestAction'
    `,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN users u_scope ON u_scope.id = nba.member_id AND u_scope.organization_id = ${orgId}
      INNER JOIN member_events source_event
        ON source_event.entity_id = nba.id
      WHERE nba.status = 'DISMISSED'
        AND source_event.event_name = 'career_os.learning_completion_processed'
        AND source_event.entity_type = 'MemberNextBestAction'
    `,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(DISTINCT nba.id)::bigint AS count
      FROM member_next_best_actions nba
      INNER JOIN users u_scope ON u_scope.id = nba.member_id AND u_scope.organization_id = ${orgId}
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
async function getPlacementStats(orgId: string) {
  const baseMember = { deletedAt: null };
  const [enrolled, placed, certifications] = await Promise.all([
    withTenantScope(orgId, (db) =>
      db.user.count({
        where: { ...baseMember, enrolledProgram: { not: null } },
      }),
    ),
    prisma.placementRecord.count({ where: { user: { organizationId: orgId } } }),
    prisma.userCertification.count({ where: { user: { organizationId: orgId } } }),
  ]);
  return { enrolled, placed, certifications, placementRate: enrolled > 0 ? Math.round((placed / enrolled) * 100) : 0 };
}

/** Get AI tool usage stats with trending */
async function getAiToolStats(orgId: string, days: number) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() - days);
  periodStart.setHours(0, 0, 0, 0);

  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - days);

  const [currentPeriodRuns, prevPeriodRuns, totalRuns, breakdown] = await Promise.all([
    countAiToolRunsBetween(orgId, periodStart, now),
    countAiToolRunsBetween(orgId, prevPeriodStart, periodStart),
    countAiToolRunsBetween(orgId, new Date(0), now),
    getAiToolUsageBreakdown(orgId, periodStart, now),
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

export async function getAdminMetrics(orgId: string) {
  return getCacheOrFetch(`admin:metrics:${orgId}`, () => _getAdminMetricsUncached(orgId), 300);
}

async function _getAdminMetricsUncached(orgId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const userScope = memberInOrg(orgId);

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
    withTenantScope(orgId, (db) => db.user.count({ where: { deletedAt: null } })),
    prisma.memberEvent.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: { createdAt: { gte: sevenDaysAgo }, ...userScope },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.memberEvent.findMany({
      take: 5000, // headroom guard — daily-series and breakdowns must not silently truncate
      where: { createdAt: { gte: fourteenDaysAgo }, ...userScope },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.goal.count({ where: { status: 'ACTIVE', ...userScope } }),
    prisma.jobApplication.count({ where: { status: { not: 'SAVED' }, ...userScope } }),
    prisma.resourceProgress.count({ where: { completedAt: { not: null }, ...userScope } }),
    prisma.learningProgress.count({ where: userScope }),
    getAiToolStats(orgId, 7),
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

  const allUsersResult = await withTenantScope(orgId, (db) => db.user.findMany({ take: 5000, select: { id: true } }))
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch((reason) => ({ status: 'rejected' as const, reason }));

  if (allUsersResult.status === 'rejected') {
    logMetricsReason('allUsers', allUsersResult.reason);
  }

  const inactiveUserIds = allUsersResult.status === 'fulfilled'
    ? allUsersResult.value.filter((u) => !active14dSet.has(u.id)).map((u) => u.id)
    : [];

  const [dailyActivityResult, enrollmentByProgramResult, placementStatsResult, careerOsMetricsResult] =
    await Promise.allSettled([
      getDailyActivity(orgId, 14),
      getEnrollmentByProgram(orgId),
      getPlacementStats(orgId),
      getCareerOsMetrics(orgId),
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
