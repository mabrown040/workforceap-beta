import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { isExcludedPublicEmployerName, isExcludedPublicJobTitle } from '@/lib/jobs/publicJobFilters';
import { computeReadinessScore, getScoreBreakdowns } from '@/lib/readiness/score';

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function generateWeeklyRecap(userId: string, weekStart: Date, weekEnd?: Date) {
  const end = weekEnd ?? (() => {
    const e = new Date(weekStart);
    e.setDate(weekStart.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  })();

  const now = new Date();

  const userCtx = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizationId: true,
      enrolledProgram: true,
      courseEnrollments: { select: { programSlug: true } },
    },
  });

  if (!userCtx) {
    console.error('[generateWeeklyRecap] user not found', userId);
    return null;
  }

  const programSlugs = [
    ...new Set(
      [
        ...userCtx.courseEnrollments.map((e) => e.programSlug),
        userCtx.enrolledProgram,
      ].filter((s): s is string => !!s?.trim()),
    ),
  ];
  const programOr: { suggestedPrograms: { equals: string[] } | { hasSome: string[] } }[] = [
    { suggestedPrograms: { equals: [] } },
  ];
  if (programSlugs.length > 0) {
    programOr.push({ suggestedPrograms: { hasSome: programSlugs } });
  }

  const [goals, jobApps, aiResults, resourceProgress, pathwayProgress, certs, upcomingSessions, newJobsRaw] =
    await Promise.all([
      prisma.goal.findMany({ take: 100, where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.jobApplication.findMany({ take: 100, where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.aIToolResult.findMany({ take: 100, where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.resourceProgress.findMany({ take: 100, where: { userId } }),
      prisma.pathwayStepProgress.findMany({ take: 100, where: { userId } }),
      prisma.userCertification.findMany({ take: 100, where: { userId } }),
      prisma.mentorSession.findMany({
        where: {
          memberId: userId,
          scheduledAt: { gte: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: { scheduledAt: true, topic: true },
      }),
      prisma.job.findMany({
        take: 100,
        where: {
          status: 'live',
          organizationId: userCtx.organizationId,
          createdAt: { gte: weekStart, lte: end },
          OR: programOr,
        },
        select: {
          title: true,
          employer: { select: { companyName: true } },
        },
      }),
    ]);

  const newLiveJobsThisWeek = newJobsRaw.filter(
    (j) =>
      !isExcludedPublicEmployerName(j.employer.companyName) && !isExcludedPublicJobTitle(j.title),
  ).length;

  const upcomingCounselorSessions = upcomingSessions.map((s) => ({
    at: s.scheduledAt.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    topic: s.topic,
  }));

  // Use direct counts from source tables (reliable; works even without event tracking)
  const applicationsAdded = jobApps.filter(
    (a) => a.status !== 'SAVED' && a.createdAt >= weekStart && a.createdAt <= end
  ).length;
  const resourcesCompleted = resourceProgress.filter(
    (r) => r.completedAt && r.completedAt >= weekStart && r.completedAt <= end
  ).length;
  const aiToolsUsedThisWeek = aiResults.filter(
    (r) => r.createdAt >= weekStart && r.createdAt <= end
  );
  const aiToolsUsed = new Set(aiToolsUsedThisWeek.map((r) => r.toolType)).size;
  const pathwayStepsCompleted = pathwayProgress.filter(
    (p) => p.status === 'completed' && p.completedAt && p.completedAt >= weekStart && p.completedAt <= end
  ).length;

  let score: number | null = null;
  try {
    score = await computeReadinessScore(userId);
  } catch (e) {
    console.error('[generateWeeklyRecap] readiness score failed', userId, e);
  }

  const recapData = {
    weekInReview: {
      applicationsAdded,
      resourcesCompleted,
      aiToolsUsed,
      pathwayStepsCompleted,
      newLiveJobsThisWeek,
    },
    upcomingCounselorSessions,
    readinessScoreSnapshot: score,
    goalsSnapshot: goals.slice(0, 3).map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      currentMetricValue: g.currentMetricValue,
      targetMetricValue: g.targetMetricValue,
    })),
    applicationsCount: jobApps.filter((a) => a.status !== 'SAVED').length,
    resourcesCompletedCount: resourceProgress.filter((r) => r.completedAt).length,
    pathwayProgressCount: pathwayProgress.filter((p) => p.status === 'completed').length,
    certificationsCount: certs.length,
    recommendedActions: [] as string[],
  };

  if (!aiResults.some((r) => r.toolType === 'resume_rewriter')) {
    recapData.recommendedActions.push('Build your resume with the Resume Rewriter');
  }
  if (!aiResults.some((r) => r.toolType === 'interview_practice')) {
    recapData.recommendedActions.push('Practice interview questions');
  }
  if (jobApps.filter((a) => a.status !== 'SAVED').length === 0) {
    recapData.recommendedActions.push('Log your first job application');
  }
  if (recapData.recommendedActions.length === 0) {
    recapData.recommendedActions.push('Keep momentum—add another application or complete a resource');
  }

  const recapRecord = await prisma.weeklyRecap.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    create: {
      userId,
      weekStartDate: weekStart,
      weekEndDate: end,
      recapJson: recapData,
      readinessScoreSnapshot: score,
      goalsSnapshotJson: recapData.goalsSnapshot,
    },
    update: {
      recapJson: recapData,
      readinessScoreSnapshot: score,
      goalsSnapshotJson: recapData.goalsSnapshot,
      generatedAt: new Date(),
    },
  });

  await trackEvent({ userId, eventName: 'weekly_recap_generated', entityType: 'weekly_recap', entityId: recapRecord.id });
  return recapRecord;
}

export type MemberRecapInput = {
  id: string;
  email: string | null;
  fullName: string | null;
  enrolledProgram: string | null;
};

export type MemberRecapOutput = {
  userId: string;
  recapData: Record<string, unknown>;
  score: number | null;
};

type RecapJsonShape = {
  weekInReview: { applicationsAdded: number; resourcesCompleted: number; aiToolsUsed: number; pathwayStepsCompleted: number; newLiveJobsThisWeek: number };
  upcomingCounselorSessions: Array<{ at: string; topic: string | null }>;
  readinessScoreSnapshot: number | null;
  goalsSnapshot: Array<{ id: string; title: string; status: string; currentMetricValue: number | null; targetMetricValue: number | null }>;
  applicationsCount: number;
  resourcesCompletedCount: number;
  pathwayProgressCount: number;
  certificationsCount: number;
  recommendedActions: string[];
};

/**
 * Batch-generate weekly recaps for many members at once.
 * Eliminates the read-side N+1 by fetching all related data in ~10 queries total.
 * Write-side upserts are still per-member (Prisma lacks bulk upsert) but capped at N writes.
 */
export async function generateWeeklyRecaps(
  members: MemberRecapInput[],
  weekStart: Date,
  weekEnd?: Date
): Promise<MemberRecapOutput[]> {
  const end = weekEnd ?? (() => {
    const e = new Date(weekStart);
    e.setDate(weekStart.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  })();
  const now = new Date();
  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) return [];

  // 1. Batch fetch user contexts + course enrollments
  const userCtxs = await prisma.user.findMany({
    take: 1000,
    where: { id: { in: memberIds } },
    select: {
      id: true,
      organizationId: true,
      enrolledProgram: true,
      courseEnrollments: { select: { programSlug: true } },
    },
  });
  const userCtxById = new Map(userCtxs.map((u) => [u.id, u]));

  // 2. Collect program slugs per user + org ids for job query
  const orgIds = [...new Set(userCtxs.map((u) => u.organizationId).filter(Boolean))];
  const programSlugsPerUser = new Map<string, string[]>();
  for (const u of userCtxs) {
    const slugs = [...new Set([...u.courseEnrollments.map((e) => e.programSlug), u.enrolledProgram].filter((s): s is string => !!s?.trim()))];
    programSlugsPerUser.set(u.id, slugs);
  }

  // Build a combined programOr for the job query
  const allProgramSlugs = [...new Set([...programSlugsPerUser.values()].flat())];
  const programOr: { suggestedPrograms: { equals: string[] } | { hasSome: string[] } }[] = [
    { suggestedPrograms: { equals: [] } },
  ];
  if (allProgramSlugs.length > 0) {
    programOr.push({ suggestedPrograms: { hasSome: allProgramSlugs } });
  }

  // 3. Batch fetch all related data
  const [goalsAll, jobAppsAll, aiResultsAll, resourceProgressAll, pathwayProgressAll, certsAll, upcomingSessionsAll, newJobsAll, scoreBreakdowns] =
    await Promise.all([
      prisma.goal.findMany({ take: 1000, where: { userId: { in: memberIds } }, orderBy: { createdAt: 'desc' } }),
      prisma.jobApplication.findMany({ take: 1000, where: { userId: { in: memberIds } }, orderBy: { createdAt: 'desc' } }),
      prisma.aIToolResult.findMany({ take: 1000, where: { userId: { in: memberIds } }, orderBy: { createdAt: 'desc' } }),
      prisma.resourceProgress.findMany({ take: 1000, where: { userId: { in: memberIds } } }),
      prisma.pathwayStepProgress.findMany({ take: 1000, where: { userId: { in: memberIds } } }),
      prisma.userCertification.findMany({ take: 1000, where: { userId: { in: memberIds } } }),
      prisma.mentorSession.findMany({
        where: { memberId: { in: memberIds }, scheduledAt: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: { memberId: true, scheduledAt: true, topic: true },
      }),
      prisma.job.findMany({
        take: 100,
        where: { status: 'live', organizationId: { in: orgIds as string[] }, createdAt: { gte: weekStart, lte: end }, OR: programOr },
        select: { title: true, employer: { select: { companyName: true } }, organizationId: true, suggestedPrograms: true },
      }),
      getScoreBreakdowns(memberIds),
    ]);

  // 4. Group by userId
  const goalsByUser = groupBy(goalsAll, 'userId');
  const jobAppsByUser = groupBy(jobAppsAll, 'userId');
  const aiResultsByUser = groupBy(aiResultsAll, 'userId');
  const resourceProgressByUser = groupBy(resourceProgressAll, 'userId');
  const pathwayProgressByUser = groupBy(pathwayProgressAll, 'userId');
  const certsByUser = groupBy(certsAll, 'userId');
  const upcomingSessionsByUser = groupBy(upcomingSessionsAll, 'memberId');

  const results: MemberRecapOutput[] = [];

  for (const member of members) {
    const userCtx = userCtxById.get(member.id);
    if (!userCtx) continue;

    const programSlugs = programSlugsPerUser.get(member.id) ?? [];

    // Filter jobs to this user's org + program match
    const userJobs = newJobsAll.filter((j) => {
      if (j.organizationId !== userCtx.organizationId) return false;
      if (programSlugs.length === 0) return true;
      const jobSlugs = (j.suggestedPrograms as string[] | null) ?? [];
      if (jobSlugs.length === 0) return true;
      return programSlugs.some((s) => jobSlugs.includes(s));
    });

    const newLiveJobsThisWeek = userJobs.filter(
      (j) => !isExcludedPublicEmployerName(j.employer.companyName) && !isExcludedPublicJobTitle(j.title)
    ).length;

    const goals = goalsByUser.get(member.id) ?? [];
    const jobApps = jobAppsByUser.get(member.id) ?? [];
    const aiResults = aiResultsByUser.get(member.id) ?? [];
    const resourceProgress = resourceProgressByUser.get(member.id) ?? [];
    const pathwayProgress = pathwayProgressByUser.get(member.id) ?? [];
    const certs = certsByUser.get(member.id) ?? [];
    const upcomingSessions = (upcomingSessionsByUser.get(member.id) ?? []).map((s) => ({
      at: s.scheduledAt.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      }),
      topic: s.topic,
    }));

    const applicationsAdded = jobApps.filter(
      (a) => a.status !== 'SAVED' && a.createdAt >= weekStart && a.createdAt <= end
    ).length;
    const resourcesCompleted = resourceProgress.filter(
      (r) => r.completedAt && r.completedAt >= weekStart && r.completedAt <= end
    ).length;
    const aiToolsUsedThisWeek = aiResults.filter((r) => r.createdAt >= weekStart && r.createdAt <= end);
    const aiToolsUsed = new Set(aiToolsUsedThisWeek.map((r) => r.toolType)).size;
    const pathwayStepsCompleted = pathwayProgress.filter(
      (p) => p.status === 'completed' && p.completedAt && p.completedAt >= weekStart && p.completedAt <= end
    ).length;

    const score = scoreBreakdowns.has(member.id)
      ? Math.min(100, Object.values(scoreBreakdowns.get(member.id)!).reduce((sum, b) => sum + b.earned, 0))
      : null;

    const recapData = {
      weekInReview: { applicationsAdded, resourcesCompleted, aiToolsUsed, pathwayStepsCompleted, newLiveJobsThisWeek },
      upcomingCounselorSessions: upcomingSessions,
      readinessScoreSnapshot: score,
      goalsSnapshot: goals.slice(0, 3).map((g) => ({
        id: g.id,
        title: g.title,
        status: g.status,
        currentMetricValue: g.currentMetricValue,
        targetMetricValue: g.targetMetricValue,
      })),
      applicationsCount: jobApps.filter((a) => a.status !== 'SAVED').length,
      resourcesCompletedCount: resourceProgress.filter((r) => r.completedAt).length,
      pathwayProgressCount: pathwayProgress.filter((p) => p.status === 'completed').length,
      certificationsCount: certs.length,
      recommendedActions: [] as string[],
    };

    if (!aiResults.some((r) => r.toolType === 'resume_rewriter')) {
      recapData.recommendedActions.push('Build your resume with the Resume Rewriter');
    }
    if (!aiResults.some((r) => r.toolType === 'interview_practice')) {
      recapData.recommendedActions.push('Practice interview questions');
    }
    if (jobApps.filter((a) => a.status !== 'SAVED').length === 0) {
      recapData.recommendedActions.push('Log your first job application');
    }
    if (recapData.recommendedActions.length === 0) {
      recapData.recommendedActions.push('Keep momentum—add another application or complete a resource');
    }

    results.push({ userId: member.id, recapData, score });
  }

  // 5. Bulk upsert weeklyRecap records (Prisma lacks native bulk upsert;
  //    we parallelize with a small concurrency cap to avoid connection pool exhaustion)
  const UPSERT_CONCURRENCY = 8;
  for (let i = 0; i < results.length; i += UPSERT_CONCURRENCY) {
    const chunk = results.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(
      chunk.map(async ({ userId, recapData, score }) => {
        try {
          const record = await prisma.weeklyRecap.upsert({
            where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
            create: {
              userId,
              weekStartDate: weekStart,
              weekEndDate: end,
              recapJson: recapData as RecapJsonShape,
              readinessScoreSnapshot: score,
              goalsSnapshotJson: recapData.goalsSnapshot as RecapJsonShape['goalsSnapshot'],
            },
            update: {
              recapJson: recapData as RecapJsonShape,
              readinessScoreSnapshot: score,
              goalsSnapshotJson: recapData.goalsSnapshot as RecapJsonShape['goalsSnapshot'],
              generatedAt: new Date(),
            },
          });
          await trackEvent({
            userId,
            eventName: 'weekly_recap_generated',
            entityType: 'weekly_recap',
            entityId: record.id,
          });
        } catch (e) {
          console.error('[generateWeeklyRecaps] upsert failed for', userId, e);
        }
      })
    );
  }

  return results;
}

function groupBy<T extends Record<string, unknown>>(arr: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = String(item[key]);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}
