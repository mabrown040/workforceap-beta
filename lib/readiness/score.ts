import { prisma } from '@/lib/db/prisma';

/* Setup tasks weighted lower; high-value outcomes weighted higher */
const WEIGHTS = {
  completeProfile: 5,
  setGoals: 10,
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

/** Narrow shapes — avoids coupling callers to full Prisma payloads. */
type ProfileSlice = {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  profilePhone: string | null;
  profileLinkedin: string | null;
  profileBio: string | null;
  resumeOriginalPath: string | null;
  resumeEnhancedPath: string | null;
} | null | undefined;

type UserSlice = { profile: ProfileSlice } | null;

export function buildScoreBreakdownFromRelations(
  user: UserSlice,
  goals: unknown[],
  aiResults: { toolType: string; createdAt?: Date | null }[],
  resourceProgress: { completedAt: Date | null }[],
  learningProgress: unknown[],
  pathwaySteps: { status: string }[],
  jobApps: { status: string }[],
  certs: unknown[],
  hasInterviewPracticeCompletion: boolean,
  lastEvent: { createdAt: Date } | null
): ScoreBreakdown {
  const toolTypes = new Set(aiResults.map((r) => r.toolType));
  const prof = user?.profile;
  const profileSignals = [
    prof?.address,
    prof?.city,
    prof?.state,
    prof?.zip,
    prof?.profilePhone,
    prof?.profileLinkedin,
    prof?.profileBio,
  ].filter((value) => !!value).length;
  const hasResumeFile = !!prof?.resumeOriginalPath || !!prof?.resumeEnhancedPath;
  const hasProfile = profileSignals >= 2 || hasResumeFile;
  const hasGoals = goals.length > 0;
  const hasResume = hasResumeFile || ['resume_rewriter', 'resume_analysis'].some((tool) => toolTypes.has(tool));
  const resourcesCompleted = resourceProgress.filter((r) => r.completedAt).length;
  const hasInterview = hasInterviewPracticeCompletion
    || ['interview_coach', 'voice_interview_video'].some((tool) => toolTypes.has(tool));
  const hasPathway = learningProgress.length > 0;
  const pathwayStepsCompleted = pathwaySteps.filter((p) => p.status === 'completed').length;
  const appCount = jobApps.filter((a) => a.status !== 'SAVED').length;
  const hasCerts = certs.length > 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const lastAiActivity = aiResults.reduce((latest, row) => {
    if (!(row.createdAt instanceof Date)) return latest;
    if (!latest || row.createdAt > latest) return row.createdAt;
    return latest;
  }, null as Date | null);
  const latestActivity = [lastEvent?.createdAt ?? null, lastAiActivity]
    .filter((value): value is Date => !!value)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const hasRecentActivity = latestActivity ? latestActivity >= sevenDaysAgo : false;

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
      earned: Math.min(pathwayStepsCompleted * 3, WEIGHTS.completePathwaySteps),
      max: WEIGHTS.completePathwaySteps,
      done: pathwayStepsCompleted >= 3,
    },
    addApplications: {
      earned: Math.min(appCount * 5, WEIGHTS.addApplications),
      max: WEIGHTS.addApplications,
      done: appCount >= 3,
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

export async function computeReadinessScore(userId: string): Promise<number> {
  const breakdown = await getScoreBreakdown(userId);
  return Math.min(
    100,
    Object.values(breakdown).reduce((sum, b) => sum + b.earned, 0)
  );
}

export async function getScoreBreakdown(userId: string): Promise<ScoreBreakdown> {
  const [user, goals, aiResults, resourceProgress, learningProgress, pathwaySteps, jobApps, certs, interviewPracticeCompletionEvent, lastEvent] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              address: true,
              city: true,
              state: true,
              zip: true,
              profilePhone: true,
              profileLinkedin: true,
              profileBio: true,
              resumeOriginalPath: true,
              resumeEnhancedPath: true,
            },
          },
        },
      }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.aIToolResult.findMany({ where: { userId }, select: { toolType: true, createdAt: true } }),
      prisma.resourceProgress.findMany({ where: { userId } }),
      prisma.learningProgress.findMany({ where: { userId } }),
      prisma.pathwayStepProgress.findMany({ where: { userId } }),
      prisma.jobApplication.findMany({ where: { userId } }),
      prisma.userCertification.findMany({ where: { userId } }),
      prisma.memberEvent.findFirst({
        where: { userId, eventName: 'career_os.interview_practice_completed' },
        select: { id: true },
      }),
      prisma.memberEvent.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);

  return buildScoreBreakdownFromRelations(
    user,
    goals,
    aiResults,
    resourceProgress,
    learningProgress,
    pathwaySteps,
    jobApps,
    certs,
    !!interviewPracticeCompletionEvent,
    lastEvent
  );
}

/** Same as getScoreBreakdown but returns a zeroed breakdown if Prisma fails (flaky DB, timeouts). */
export async function getScoreBreakdownSafe(userId: string): Promise<ScoreBreakdown> {
  try {
    return await getScoreBreakdown(userId);
  } catch (e) {
    console.error('[getScoreBreakdownSafe]', userId, e);
    return buildScoreBreakdownFromRelations(null, [], [], [], [], [], [], [], false, null);
  }
}
