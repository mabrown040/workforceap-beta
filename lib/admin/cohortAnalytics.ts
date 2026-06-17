import { ApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

const VOICE_TOOL_TYPES = [
  'readiness_voice_session',
  'wioa_prequalification_voice_session',
  'employer_voice_session',
  'partner_voice_session',
] as const;

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
  const now = new Date();
  const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));

  const users = await prisma.user.findMany({
    take: 500,
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const recaps = await prisma.weeklyRecap.findMany({
    take: 500,
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

function startOfIsoWeekUtc(date: Date): Date {
  const day = date.getUTCDay() || 7;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inRange(date: Date | null | undefined, start: Date, end: Date): boolean {
  return date != null && date >= start && date < end;
}

function averageDays(rows: Array<{ submittedAt: Date | null; createdAt: Date; updatedAt: Date }>): number | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => {
    const start = row.submittedAt ?? row.createdAt;
    return sum + Math.max(0, row.updatedAt.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  }, 0);
  return Math.round((total / rows.length) * 10) / 10;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

type PeriodWindow = { start: Date; end: Date };

type WeeklyScoreboardPeriod = {
  applicationsReviewed: number;
  approvals: number;
  enrollments: number;
  messagesSent: number;
};

export type WeeklyScoreboardComparison = WeeklyScoreboardPeriod & {
  previous: WeeklyScoreboardPeriod;
  deltas: Record<keyof WeeklyScoreboardPeriod, number>;
  pctChanges: Record<keyof WeeklyScoreboardPeriod, number | null>;
};

export type WeeklyCounselorLeaderboardRow = {
  counselorId: string;
  counselorUserId: string;
  name: string;
  email: string;
  sessionsHeld: number;
  applicationsReviewed: number;
  membersContacted: number;
};

export type WeeklyFunnelVelocity = {
  currentAvgDays: number | null;
  trailingFourWeekAvgDays: number | null;
  currentApprovedCount: number;
  trailingApprovedCount: number;
};

export type WeeklyAtRiskMember = {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  lastActivityAt: Date | null;
};

export type WeeklyScoreboardStats = {
  weekStart: Date;
  weekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
  comparison: WeeklyScoreboardComparison;
  counselors: WeeklyCounselorLeaderboardRow[];
  funnelVelocity: WeeklyFunnelVelocity;
  atRisk: {
    count: number;
    staleCutoff: Date;
    sample: WeeklyAtRiskMember[];
  };
};

function countPeriodMetrics(
  window: PeriodWindow,
  applications: Array<{ status: ApplicationStatus; updatedAt: Date }>,
  enrollmentUserIds: Set<string>,
  messageCountsByPeriodKey: Map<string, number>,
  key: string,
): WeeklyScoreboardPeriod {
  const reviewedStatuses = new Set<ApplicationStatus>([
    ApplicationStatus.APPROVED,
    ApplicationStatus.DENIED,
    ApplicationStatus.NEEDS_INFO,
  ]);

  return {
    applicationsReviewed: applications.filter((app) => reviewedStatuses.has(app.status) && inRange(app.updatedAt, window.start, window.end)).length,
    approvals: applications.filter((app) => app.status === ApplicationStatus.APPROVED && inRange(app.updatedAt, window.start, window.end)).length,
    enrollments: enrollmentUserIds.size,
    messagesSent: messageCountsByPeriodKey.get(key) ?? 0,
  };
}

function metadataString(value: Prisma.JsonValue | null, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = (value as Record<string, Prisma.JsonValue>)[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export async function getWeeklyScoreboardStats(now = new Date()): Promise<WeeklyScoreboardStats> {
  const weekStart = startOfIsoWeekUtc(now);
  const weekEndExclusive = addDays(weekStart, 7);
  const lastWeekStart = addDays(weekStart, -7);
  const trailingFourWeekStart = addDays(weekStart, -28);
  const staleCutoff = addDays(now, -14);

  const [
    applications,
    userEnrollments,
    courseEnrollments,
    portalMessagesThisWeek,
    portalMessagesLastWeek,
    applicationMessagesThisWeek,
    applicationMessagesLastWeek,
    counselors,
    sessionEvents,
    reviewAuditLogs,
    memberMessages,
    atRiskMembers,
  ] = await Promise.all([
    prisma.application.findMany({
      where: { updatedAt: { gte: trailingFourWeekStart, lt: weekEndExclusive } },
      select: { status: true, submittedAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, enrolledAt: { gte: lastWeekStart, lt: weekEndExclusive } },
      select: { id: true, enrolledAt: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { enrolledAt: { gte: lastWeekStart, lt: weekEndExclusive }, user: { deletedAt: null } },
      select: { userId: true, enrolledAt: true },
    }),
    prisma.message.count({ where: { authorId: { not: null }, createdAt: { gte: weekStart, lt: weekEndExclusive } } }),
    prisma.message.count({ where: { authorId: { not: null }, createdAt: { gte: lastWeekStart, lt: weekStart } } }),
    prisma.applicationMessage.count({ where: { authorId: { not: null }, createdAt: { gte: weekStart, lt: weekEndExclusive } } }),
    prisma.applicationMessage.count({ where: { authorId: { not: null }, createdAt: { gte: lastWeekStart, lt: weekStart } } }),
    prisma.counselor.findMany({
      where: { active: true },
      select: { id: true, userId: true, user: { select: { fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    }),
    prisma.memberEvent.findMany({
      where: {
        eventName: 'ai_tool_run_completed',
        sessionId: { not: null },
        createdAt: { gte: weekStart, lt: weekEndExclusive },
      },
      select: { sessionId: true, metadata: true },
      take: 5000,
    }),
    prisma.auditLog.findMany({
      where: {
        action: 'application_status_change',
        targetType: 'application',
        createdAt: { gte: weekStart, lt: weekEndExclusive },
      },
      select: { actorUserId: true },
      take: 5000,
    }),
    prisma.message.findMany({
      where: {
        authorId: { not: null },
        createdAt: { gte: weekStart, lt: weekEndExclusive },
        thread: { kind: 'member', memberId: { not: null } },
      },
      select: { authorId: true, thread: { select: { memberId: true } } },
      take: 5000,
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
        memberEvents: { none: { createdAt: { gte: staleCutoff } } },
        OR: [
          { courseraEnrollmentApproved: true },
          { enrolledAt: { not: null } },
          { courseEnrollments: { some: {} } },
          { applications: { some: { status: ApplicationStatus.APPROVED } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        memberEvents: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 5000,
    }),
  ]);

  const thisWeekEnrollmentUserIds = new Set<string>();
  const lastWeekEnrollmentUserIds = new Set<string>();
  for (const row of userEnrollments) {
    if (inRange(row.enrolledAt, weekStart, weekEndExclusive)) thisWeekEnrollmentUserIds.add(row.id);
    if (inRange(row.enrolledAt, lastWeekStart, weekStart)) lastWeekEnrollmentUserIds.add(row.id);
  }
  for (const row of courseEnrollments) {
    if (inRange(row.enrolledAt, weekStart, weekEndExclusive)) thisWeekEnrollmentUserIds.add(row.userId);
    if (inRange(row.enrolledAt, lastWeekStart, weekStart)) lastWeekEnrollmentUserIds.add(row.userId);
  }

  const messageCountsByPeriodKey = new Map([
    ['this', portalMessagesThisWeek + applicationMessagesThisWeek],
    ['last', portalMessagesLastWeek + applicationMessagesLastWeek],
  ]);
  const current = countPeriodMetrics(
    { start: weekStart, end: weekEndExclusive },
    applications,
    thisWeekEnrollmentUserIds,
    messageCountsByPeriodKey,
    'this',
  );
  const previous = countPeriodMetrics(
    { start: lastWeekStart, end: weekStart },
    applications,
    lastWeekEnrollmentUserIds,
    messageCountsByPeriodKey,
    'last',
  );

  const metricKeys = ['applicationsReviewed', 'approvals', 'enrollments', 'messagesSent'] as const;
  const deltas = Object.fromEntries(metricKeys.map((key) => [key, current[key] - previous[key]])) as Record<keyof WeeklyScoreboardPeriod, number>;
  const pctChanges = Object.fromEntries(metricKeys.map((key) => [key, percentChange(current[key], previous[key])])) as Record<keyof WeeklyScoreboardPeriod, number | null>;

  const sessionsByActor = new Map<string, Set<string>>();
  for (const event of sessionEvents) {
    if (!event.sessionId) continue;
    const actorUserId = metadataString(event.metadata, 'actorUserId');
    if (!actorUserId) continue;
    if (!sessionsByActor.has(actorUserId)) sessionsByActor.set(actorUserId, new Set());
    sessionsByActor.get(actorUserId)!.add(event.sessionId);
  }

  const reviewsByActor = new Map<string, number>();
  for (const log of reviewAuditLogs) {
    if (!log.actorUserId) continue;
    reviewsByActor.set(log.actorUserId, (reviewsByActor.get(log.actorUserId) ?? 0) + 1);
  }

  const contactedByActor = new Map<string, Set<string>>();
  for (const message of memberMessages) {
    if (!message.authorId || !message.thread.memberId) continue;
    if (!contactedByActor.has(message.authorId)) contactedByActor.set(message.authorId, new Set());
    contactedByActor.get(message.authorId)!.add(message.thread.memberId);
  }

  const counselorRows: WeeklyCounselorLeaderboardRow[] = counselors.map((counselor) => ({
    counselorId: counselor.id,
    counselorUserId: counselor.userId,
    name: counselor.user.fullName,
    email: counselor.user.email,
    sessionsHeld: sessionsByActor.get(counselor.userId)?.size ?? 0,
    applicationsReviewed: reviewsByActor.get(counselor.userId) ?? 0,
    membersContacted: contactedByActor.get(counselor.userId)?.size ?? 0,
  }));

  counselorRows.sort((a, b) => {
    const aTotal = a.sessionsHeld + a.applicationsReviewed + a.membersContacted;
    const bTotal = b.sessionsHeld + b.applicationsReviewed + b.membersContacted;
    return bTotal - aTotal || a.name.localeCompare(b.name);
  });

  const currentApproved = applications.filter((app) => app.status === ApplicationStatus.APPROVED && inRange(app.updatedAt, weekStart, weekEndExclusive));
  const trailingApproved = applications.filter((app) => app.status === ApplicationStatus.APPROVED && inRange(app.updatedAt, trailingFourWeekStart, weekStart));

  return {
    weekStart,
    weekEnd: addDays(weekEndExclusive, -1),
    lastWeekStart,
    lastWeekEnd: addDays(weekStart, -1),
    comparison: {
      ...current,
      previous,
      deltas,
      pctChanges,
    },
    counselors: counselorRows,
    funnelVelocity: {
      currentAvgDays: averageDays(currentApproved),
      trailingFourWeekAvgDays: averageDays(trailingApproved),
      currentApprovedCount: currentApproved.length,
      trailingApprovedCount: trailingApproved.length,
    },
    atRisk: {
      count: atRiskMembers.length,
      staleCutoff,
      sample: atRiskMembers.slice(0, 5).map((member) => ({
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        enrolledProgram: member.enrolledProgram,
        lastActivityAt: member.memberEvents[0]?.createdAt ?? null,
      })),
    },
  };
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
  const now = new Date();
  const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));

  const users = await prisma.user.findMany({
    take: 500,
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const [savedRuns, voiceEvents] = await Promise.all([
    prisma.aIToolResult.findMany({
      take: 500,
      select: { userId: true, createdAt: true },
    }),
    prisma.$queryRaw<Array<{ user_id: string; created_at: Date }>>`
      SELECT "user_id", "created_at"
      FROM "member_events"
      WHERE "event_name" = 'ai_tool_run_started'
        AND "entity_type" = 'ai_tool'
        AND COALESCE(metadata->>'tool', '') IN (${Prisma.join(VOICE_TOOL_TYPES)})
    `,
  ]);

  // Merge voice session events into the unified runs list
  const runs = [
    ...savedRuns,
    ...voiceEvents.map((e) => ({ userId: e.user_id, createdAt: e.created_at })),
  ];

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
    take: 500,
    where: { deletedAt: null },
    select: { id: true, enrolledProgram: true },
  });
  const byCohort = userIdsByCohort(users);

  const certs = await prisma.userCertification.findMany({
    take: 500,
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
