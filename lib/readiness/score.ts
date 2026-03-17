import { prisma } from '@/lib/db/prisma';

/* Setup tasks weighted lower; high-value outcomes weighted higher */
const WEIGHTS = {
  completeProfile: 5,
  setGoals: 5,
  buildResume: 20,
  complete2Resources: 10,
  practiceInterview: 15,
  startPathway: 5,
  completePathwaySteps: 15,
  addApplications: 15,
  trackCertifications: 5,
  weeklyConsistency: 5,
};

export type ScoreBreakdown = {
  completeProfile: { earned: number; max: number; done: boolean };
  setGoals: { earned: number; max: number; done: boolean };
  buildResume: { earned: number; max: number; done: boolean };
  complete2Resources: { earned: number; max: number; done: boolean };
  practiceInterview: { earned: number; max: number; done: boolean };
  startPathway: { earned: number; max: number; done: boolean };
  completePathwaySteps: { earned: number; max: number; done: boolean };
  addApplications: { earned: number; max: number; done: boolean };
  trackCertifications: { earned: number; max: number; done: boolean };
  weeklyConsistency: { earned: number; max: number; done: boolean };
};

export async function computeReadinessScore(userId: string): Promise<number> {
  const breakdown = await getScoreBreakdown(userId);
  return Math.min(
    100,
    Object.values(breakdown).reduce((sum, b) => sum + b.earned, 0)
  );
}

export async function getScoreBreakdown(userId: string): Promise<ScoreBreakdown> {
  const [user, goals, aiResults, resourceProgress, learningProgress, pathwaySteps, jobApps, certs, lastEvent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.aIToolResult.findMany({ where: { userId }, select: { toolType: true } }),
    prisma.resourceProgress.findMany({ where: { userId } }),
    prisma.learningProgress.findMany({ where: { userId } }),
    prisma.pathwayStepProgress.findMany({ where: { userId } }),
    prisma.jobApplication.findMany({ where: { userId } }),
    prisma.userCertification.findMany({ where: { userId } }),
    prisma.memberEvent.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const toolTypes = new Set(aiResults.map((r) => r.toolType));
  const hasProfile = !!user?.profile && (!!user.profile.address || !!user.profile.city || !!user.profile.zip);
  const hasGoals = goals.length > 0;
  const hasResume = toolTypes.has('resume_rewriter');
  const resourcesCompleted = resourceProgress.filter((r) => r.completedAt).length;
  const hasInterview = toolTypes.has('interview_practice');
  const hasPathway = learningProgress.length > 0;
  const pathwayStepsCompleted = pathwaySteps.filter((p) => p.status === 'completed').length;
  const appCount = jobApps.filter((a) => a.status !== 'SAVED').length;
  const hasCerts = certs.length > 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const hasRecentActivity = lastEvent ? new Date(lastEvent.createdAt) >= sevenDaysAgo : false;

  return {
    completeProfile: {
      earned: hasProfile ? WEIGHTS.completeProfile : 0,
      max: WEIGHTS.completeProfile,
      done: hasProfile,
    },
    setGoals: {
      earned: hasGoals ? WEIGHTS.setGoals : 0,
      max: WEIGHTS.setGoals,
      done: hasGoals,
    },
    buildResume: {
      earned: hasResume ? WEIGHTS.buildResume : 0,
      max: WEIGHTS.buildResume,
      done: hasResume,
    },
    complete2Resources: {
      earned: Math.min(resourcesCompleted * 5, WEIGHTS.complete2Resources),
      max: WEIGHTS.complete2Resources,
      done: resourcesCompleted >= 2,
    },
    practiceInterview: {
      earned: hasInterview ? WEIGHTS.practiceInterview : 0,
      max: WEIGHTS.practiceInterview,
      done: hasInterview,
    },
    startPathway: {
      earned: hasPathway ? WEIGHTS.startPathway : 0,
      max: WEIGHTS.startPathway,
      done: hasPathway,
    },
    completePathwaySteps: {
      earned: Math.min(pathwayStepsCompleted * 2, WEIGHTS.completePathwaySteps),
      max: WEIGHTS.completePathwaySteps,
      done: pathwayStepsCompleted >= 5,
    },
    addApplications: {
      earned: Math.min(appCount * 2, WEIGHTS.addApplications),
      max: WEIGHTS.addApplications,
      done: appCount >= 5,
    },
    trackCertifications: {
      earned: hasCerts ? WEIGHTS.trackCertifications : 0,
      max: WEIGHTS.trackCertifications,
      done: hasCerts,
    },
    weeklyConsistency: {
      earned: hasRecentActivity ? WEIGHTS.weeklyConsistency : 0,
      max: WEIGHTS.weeklyConsistency,
      done: hasRecentActivity,
    },
  };
}
