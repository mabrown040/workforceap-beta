import { prisma } from '@/lib/db/prisma';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';
import { getMemberEngagementSignals } from '@/lib/member/memberEngagementSignals';
import type { MemberEngagementSignals } from '@/lib/member/memberEngagementSignals';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';

// ─── Scoring Configuration ────────────────────────────────────────────────────

export interface AtRiskFactor {
  name: string;
  weight: number;
  description: string;
}

export interface AtRiskScore {
  userId: string;
  score: number; // 0–100
  factors: AtRiskFactor[];
  lastActivityAt: Date | null;
  recommendedAction: string;
}

const FACTORS = {
  NO_LOGIN_7_DAYS: { weight: 25, description: 'No login in 7 days' },
  NO_LOGIN_14_DAYS: { weight: 40, description: 'No login in 14 days' },
  STALE_TRAINING: { weight: 30, description: 'Training flagged as stale' },
  INCOMPLETE_FIRST_COURSE: { weight: 20, description: 'Enrolled but has not started first course' },
  NO_COUNSELOR_MESSAGE_7_DAYS: { weight: 15, description: 'No counselor message in 7 days' },
  ASSESSMENT_INCOMPLETE: { weight: 25, description: 'Enrolled but assessment not completed' },
  NO_RESUME: { weight: 10, description: 'No resume uploaded' },
  NO_JOB_APPLICATIONS: { weight: 15, description: 'No job applications after placement-ready' },
} as const;

export const THRESHOLDS = {
  CRITICAL: 70,
  HIGH: 50,
  MEDIUM: 30,
  LOW: 0,
} as const;

export function getRiskLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= THRESHOLDS.HIGH) return 'HIGH';
  if (score >= THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

// ─── Core Scoring Function ──────────────────────────────────────────────────

export async function calculateAtRiskScore(userId: string): Promise<AtRiskScore> {
  const [user, engagement] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        enrolledProgram: true,
        assessmentCompleted: true,
        staleTrainingDetectedAt: true,
        lastCourseraAutoSyncAt: true,
        createdAt: true,
        profile: {
          select: {
            resumeOriginalPath: true,
            resumeEnhancedPath: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    }),
    getMemberEngagementSignals(userId),
  ]);

  if (!user) {
    throw new Error(`Member not found: ${userId}`);
  }

  const factors: AtRiskFactor[] = [];
  let score = 0;

  // Login recency
  const daysSinceLogin = engagement.lastLoginAt
    ? Math.floor((Date.now() - engagement.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLogin >= 14) {
    score += FACTORS.NO_LOGIN_14_DAYS.weight;
    factors.push({ ...FACTORS.NO_LOGIN_14_DAYS, name: 'NO_LOGIN_14_DAYS' });
  } else if (daysSinceLogin >= 7) {
    score += FACTORS.NO_LOGIN_7_DAYS.weight;
    factors.push({ ...FACTORS.NO_LOGIN_7_DAYS, name: 'NO_LOGIN_7_DAYS' });
  }

  // Stale training
  if (user.staleTrainingDetectedAt) {
    const daysStale = Math.floor(
      (Date.now() - user.staleTrainingDetectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysStale <= 7) {
      score += FACTORS.STALE_TRAINING.weight;
      factors.push({ ...FACTORS.STALE_TRAINING, name: 'STALE_TRAINING' });
    }
  }

  // Enrollment + training progress (prefer live B4B enrollmentReports when configured).
  if (user.enrolledProgram) {
    const courseraProgramId =
      DISCOVERED_COURSERA_PROGRAMS[user.enrolledProgram]?.courseraProgramId;
    const b4bProgress =
      user.email?.trim()
        ? await fetchLearnerProgressFromB4B(user.email, {
            programId: courseraProgramId,
          }).catch(() => new Map())
        : new Map();

    const trainingView = await loadMemberProgramTrainingView({
      userId,
      programSlug: user.enrolledProgram,
      b4bProgress,
    });

    if (!trainingView) {
      score += FACTORS.INCOMPLETE_FIRST_COURSE.weight;
      factors.push({ ...FACTORS.INCOMPLETE_FIRST_COURSE, name: 'INCOMPLETE_FIRST_COURSE' });
    } else if (!trainingView.hasStartedTraining) {
      score += FACTORS.INCOMPLETE_FIRST_COURSE.weight;
      factors.push({ ...FACTORS.INCOMPLETE_FIRST_COURSE, name: 'INCOMPLETE_FIRST_COURSE' });
    }

    if (!user.assessmentCompleted) {
      score += FACTORS.ASSESSMENT_INCOMPLETE.weight;
      factors.push({ ...FACTORS.ASSESSMENT_INCOMPLETE, name: 'ASSESSMENT_INCOMPLETE' });
    }

    // Job applications (only if placement-ready: completed courses + assessment)
    if (
      trainingView &&
      trainingView.allCoursesComplete &&
      user.assessmentCompleted &&
      user._count.jobApplications === 0
    ) {
      score += FACTORS.NO_JOB_APPLICATIONS.weight;
      factors.push({ ...FACTORS.NO_JOB_APPLICATIONS, name: 'NO_JOB_APPLICATIONS' });
    }
  }

  // Counselor message recency
  const lastCounselorMessage = await prisma.message.findFirst({
    where: {
      thread: { memberId: userId },
      authorId: { not: userId },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (lastCounselorMessage) {
    const daysSinceCounselorMessage = Math.floor(
      (Date.now() - lastCounselorMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCounselorMessage >= 7) {
      score += FACTORS.NO_COUNSELOR_MESSAGE_7_DAYS.weight;
      factors.push({ ...FACTORS.NO_COUNSELOR_MESSAGE_7_DAYS, name: 'NO_COUNSELOR_MESSAGE_7_DAYS' });
    }
  }

  // Resume
  const hasResume = !!(user.profile?.resumeOriginalPath || user.profile?.resumeEnhancedPath);
  if (!hasResume) {
    score += FACTORS.NO_RESUME.weight;
    factors.push({ ...FACTORS.NO_RESUME, name: 'NO_RESUME' });
  }

  // Cap at 100
  score = Math.min(100, score);

  const lastActivityAt = engagement.lastLoginAt ?? user.lastCourseraAutoSyncAt ?? user.createdAt;
  const recommendedAction = buildRecommendedAction(score, factors);

  return {
    userId,
    score,
    factors,
    lastActivityAt,
    recommendedAction,
  };
}

function buildRecommendedAction(score: number, factors: AtRiskFactor[]): string {
  if (score >= THRESHOLDS.CRITICAL) {
    const topFactor = factors.sort((a, b) => b.weight - a.weight)[0];
    return `Immediate outreach needed: ${topFactor?.description ?? 'Multiple risk factors'}. Schedule call within 24 hours.`;
  }
  if (score >= THRESHOLDS.HIGH) {
    return 'Proactive outreach recommended: Send check-in message or schedule counseling session this week.';
  }
  if (score >= THRESHOLDS.MEDIUM) {
    return 'Monitor and include in weekly digest. Consider nudge if score increases.';
  }
  return 'Low risk. Continue standard support cadence.';
}

// ─── Batch Scoring ──────────────────────────────────────────────────────────

export async function calculateAllAtRiskScores(): Promise<AtRiskScore[]> {
  const activeMembers = await prisma.user.findMany({
    take: 5000,
    where: {
      deletedAt: null,
      // Exclude already placed members
      placementRecord: null,
    },
    select: { id: true },
  });

  const scores: AtRiskScore[] = [];
  for (const member of activeMembers) {
    try {
      const score = await calculateAtRiskScore(member.id);
      scores.push(score);
    } catch (err) {
      console.error(`[atRisk] Failed to score member ${member.id}:`, err);
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}

// ─── Alert Persistence ──────────────────────────────────────────────────────

export async function persistAtRiskAlert(score: AtRiskScore): Promise<void> {
  const existing = await prisma.atRiskAlert.findFirst({
    where: {
      userId: score.userId,
      status: { in: ['open', 'acknowledged'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    // Update if score changed significantly (>10 points)
    if (Math.abs(existing.score - score.score) > 10) {
      await prisma.atRiskAlert.update({
        where: { id: existing.id },
        data: {
          score: score.score,
          factors: score.factors as any,
          updatedAt: new Date(),
        },
      });
    }
  } else {
    await prisma.atRiskAlert.create({
      data: {
        userId: score.userId,
        score: score.score,
        factors: score.factors as any,
        status: 'open',
      },
    });
  }
}
