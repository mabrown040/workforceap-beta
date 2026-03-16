import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { computeReadinessScore } from '@/lib/readiness/score';

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

  const [goals, jobApps, aiResults, resourceProgress, pathwayProgress, certs] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.aIToolResult.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.resourceProgress.findMany({ where: { userId } }),
    prisma.pathwayStepProgress.findMany({ where: { userId } }),
    prisma.userCertification.findMany({ where: { userId } }),
  ]);

  const events = await prisma.memberEvent.findMany({
    where: { userId, createdAt: { gte: weekStart, lte: end } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const applicationsAdded = events.filter((e) => e.eventName === 'application_added').length;
  const resourcesCompleted = events.filter((e) => e.eventName === 'resource_completed').length;
  const aiToolsUsed = new Set(events.filter((e) => e.eventName === 'ai_tool_submitted').map((e) => e.entityId)).size;
  const pathwayStepsCompleted = events.filter((e) => e.eventName === 'pathway_step_completed').length;

  const score = await computeReadinessScore(userId);

  const recapData = {
    weekInReview: { applicationsAdded, resourcesCompleted, aiToolsUsed, pathwayStepsCompleted },
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
