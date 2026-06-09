import { prisma } from '@/lib/db/prisma';
import { getCacheOrFetch, invalidateCache } from '@/lib/cache';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildMemberApplicationStatusView, type MemberApplicationStatusView } from './memberApplicationStatus';
import { loadMemberProgramTrainingView, type MemberProgramTrainingView } from './memberProgramTrainingView';
import { getProfileCompleteness, getProfileMissingFields } from '@/lib/resume/profileCompleteness';
import { buildNextBestActions, type NextBestAction, type NextBestActionsContext } from './nextBestActions';
import { getMemberEngagementSignals, type MemberEngagementSignals } from './memberEngagementSignals';
import { getMemberResumePlainText } from './getMemberResumePlainText';
import { careerMatchResultNullableSchema } from '@/lib/validation/careerMatchResult';
import type { LearnerProgressByContent } from '@/lib/coursera/learnerProgress';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MemberChecklist = {
  createAccount: true;
  chooseProgram: boolean;
  completeAssessment: boolean;
  startFirstCourse: boolean;
  completeFirstCourse: boolean;
};

export type MemberState = {
  userId: string;
  email: string;
  fullName: string | null;

  // Application
  application: MemberApplicationStatusView | null;

  // Program / Training
  enrolledProgram: string | null;
  programName: string | null;
  trainingView: MemberProgramTrainingView | null;
  assessmentCompleted: boolean;

  // Profile
  profileCompletenessPct: number;
  profileMissingFields: string[];
  profile: {
    employmentStatus: string | null;
    educationLevel: string | null;
  } | null;

  // Engagement / Artifacts
  hasResume: boolean;
  hasCompletedInterviewPractice: boolean;
  jobApplicationCount: number;
  counselorUnreadCount: number;
  weeklyRecapUnopened: boolean;

  // Career
  careerRecommendation: CareerMatchResult | null;
  inferredTargetRole: string | null;

  // Derived
  checklist: MemberChecklist;
  nextBestActions: NextBestAction[];
  stateLetter: 'A' | 'B' | 'C' | 'D';
};

export type MemberStateFull = MemberState & {
  placement: { placedAt: Date | null; retentionDecision: string | null; onboardingWindowEnd: Date | null } | null;
  courseEnrollment: { enrolledByAdminId: string | null; id: string } | null;
  counselorAssignment: { counselorName: string | null; assignedAt: Date | null } | null;
  recentMessages: { unreadCount: number; lastMessageAt: Date | null };
  memberEvents: Array<{ type: string; createdAt: Date; metadata?: Record<string, unknown> }>;
  partnerContext: { partnerName: string | null; referralSource: string | null } | null;
};

// ─── Core Data Fetch ─────────────────────────────────────────────────────────

async function loadMemberCore(userId: string) {
  const user = await prisma.$transaction((tx) =>
    tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        enrolledProgram: true,
        enrolledAt: true,
        assessmentCompleted: true,
        assessmentCompletedAt: true,
        careerRecommendationJson: true,
        programInterest: true,
        interviewEligible: true,
        interviewRequestedAt: true,
        interviewCompletedAt: true,
        onboardingCompletedAt: true,
        tourCompletedAt: true,
        needsComputerSupportFollowUp: true,
        workspaceEmail: true,
        workspaceEmailProvisioned: true,
        preScreeningResponse: { select: { id: true } },
        profile: {
          select: {
            profilePhone: true,
            profileAddress: true,
            profileLinkedin: true,
            profileBio: true,
            employmentStatus: true,
            educationLevel: true,
            resumeOriginalPath: true,
            resumeEnhancedPath: true,
            referralSource: true,
            city: true,
            state: true,
            zip: true,
            dob: true,
            isMinor: true,
          },
        },
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            programInterest: true,
            submittedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    })
  );
  return user;
}

async function loadEngagement(userId: string): Promise<MemberEngagementSignals> {
  return getMemberEngagementSignals(userId);
}

async function loadLatestResumeText(userId: string): Promise<string | null> {
  const fromFile = await getMemberResumePlainText(userId, 8000, { preferOriginal: true });
  if (fromFile && fromFile.trim().length > 40) return fromFile.trim();

  const aiResult = await prisma.$transaction((tx) =>
    tx.aIToolResult.findFirst({
      where: { userId, toolType: 'resume_analysis' },
      orderBy: { createdAt: 'desc' },
      select: { output: true },
    })
  );
  if (aiResult?.output && aiResult.output.trim().length > 40) return aiResult.output.trim().slice(0, 8000);

  return null;
}

async function loadHasCompletedInterviewPractice(userId: string): Promise<boolean> {
  const event = await prisma.$transaction((tx) =>
    tx.memberEvent.findFirst({
      where: { userId, eventName: 'career_os.interview_practice_completed' },
      select: { id: true },
    })
  );

  return !!event;
}

function inferTargetRole(
  careerRec: CareerMatchResult | null,
  programInterest: string | null,
  enrolledProgram: string | null
): string | null {
  if (careerRec?.topOccupations?.[0]?.title) {
    return careerRec.topOccupations[0].title;
  }
  if (programInterest) {
    return programInterest;
  }
  if (enrolledProgram) {
    const program = getProgramBySlug(enrolledProgram);
    return program?.title ?? enrolledProgram;
  }
  return null;
}

function deriveStateLetter(args: {
  applicationExists: boolean;
  enrolledProgram: string | null;
  assessmentCompleted: boolean;
}): 'A' | 'B' | 'C' | 'D' {
  const { applicationExists, enrolledProgram, assessmentCompleted } = args;
  if (!applicationExists) return 'A';
  if (!enrolledProgram) return 'B';
  if (!assessmentCompleted) return 'C';
  return 'D';
}

// ─── Public API ──────────────────────────────────────────────────────────────

async function _getMemberStateUncached(
  userId: string,
  opts: {
    b4bProgress?: LearnerProgressByContent;
    activeProgramSlug?: string | null;
  } = {},
): Promise<MemberState> {
  const [user, engagement, latestResumeText, hasCompletedInterviewPractice] = await Promise.all([
    loadMemberCore(userId),
    loadEngagement(userId),
    loadLatestResumeText(userId),
    loadHasCompletedInterviewPractice(userId),
  ]);

  if (!user) {
    throw new Error(`Member not found: ${userId}`);
  }

  const profile = user.profile;
  const latestApplication = user.applications[0] ?? null;

  // Multi-program: prefer the explicitly-passed active slug (from
  // `getActiveProgramForDashboard`) so the trainingView we compute matches
  // the program the dashboard hero is rendering. Fall back to the legacy
  // single-program field for callers that haven't been wired through yet.
  const programSlugForTraining = opts.activeProgramSlug ?? user.enrolledProgram;

  const trainingView = programSlugForTraining
    ? await loadMemberProgramTrainingView({
        userId: user.id,
        programSlug: programSlugForTraining,
        b4bProgress: opts.b4bProgress,
      })
    : null;

  const application = latestApplication
    ? buildMemberApplicationStatusView(
        latestApplication,
        {
          enrolledProgram: user.enrolledProgram,
          enrolledAt: user.enrolledAt,
          assessmentCompleted: user.assessmentCompleted,
        },
        {
          preScreeningDone: !!user.preScreeningResponse,
          interviewEligible: user.interviewEligible ?? false,
          interviewRequested: !!user.interviewRequestedAt,
          interviewCompleted: !!user.interviewCompletedAt,
        }
      )
    : null;

  const profileCompletenessPct = getProfileCompleteness(profile, {
    fullName: user.fullName,
    email: user.email,
    enrolledProgram: user.enrolledProgram,
    assessmentCompleted: user.assessmentCompleted,
  });
  const profileMissingFields = getProfileMissingFields(profile, {
    fullName: user.fullName,
    email: user.email,
    enrolledProgram: user.enrolledProgram,
    assessmentCompleted: user.assessmentCompleted,
  });

  const careerRecommendation = careerMatchResultNullableSchema.safeParse(user.careerRecommendationJson).data ?? null;
  const inferredTargetRole = inferTargetRole(
    careerRecommendation,
    user.programInterest,
    user.enrolledProgram
  );

  const stateLetter = deriveStateLetter({
    applicationExists: !!latestApplication,
    enrolledProgram: user.enrolledProgram,
    assessmentCompleted: user.assessmentCompleted,
  });

  const completedCount = trainingView?.completedCount ?? 0;
  const checklist: MemberChecklist = {
    createAccount: true,
    chooseProgram: !!user.enrolledProgram,
    completeAssessment: user.assessmentCompleted,
    startFirstCourse: trainingView ? trainingView.hasStartedTraining : completedCount >= 1,
    completeFirstCourse: trainingView ? trainingView.hasCompletedFirstCourse : completedCount >= 1,
  };

  const actionsCtx: NextBestActionsContext = {
    state: stateLetter,
    noApplicationOnFile: !latestApplication,
    enrolledProgram: user.enrolledProgram,
    assessmentCompleted: user.assessmentCompleted,
    completedCourseCount: trainingView?.completedCount,
    starterProfileReviewRequired: false,
    starterProfileMissingFields: [],
    hasResume: !!latestResumeText,
    hasCompletedInterviewPractice,
    profileCompletenessPct,
    profileMissingFields,
    jobApplicationCount: user._count?.jobApplications ?? 0,
    counselorUnreadCount: engagement.counselorUnreadCount,
    weeklyRecapUnopened: engagement.weeklyRecapUnopened,
    courseEnrollmentActive: false,
    placementPlacedAt: null,
    placementRetentionDecision: null,
    trainingCoursesIncomplete: trainingView ? !trainingView.allCoursesComplete : false,
    nextIncompleteCourseName: trainingView?.nextIncompleteCourseName ?? null,
  };

  const nextBestActions = buildNextBestActions(actionsCtx);

  // Surface the active program (which may differ from the legacy
  // `User.enrolledProgram` after multi-enrollment) so callers always see
  // the title that matches the trainingView numbers above.
  const surfacedProgram = programSlugForTraining;

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    application,
    enrolledProgram: surfacedProgram,
    programName: surfacedProgram ? getProgramBySlug(surfacedProgram)?.title ?? surfacedProgram : null,
    trainingView,
    assessmentCompleted: user.assessmentCompleted,
    profileCompletenessPct,
    profileMissingFields,
    profile: profile ? {
      employmentStatus: profile.employmentStatus ?? null,
      educationLevel: profile.educationLevel ?? null,
    } : null,
    hasResume: !!latestResumeText,
    hasCompletedInterviewPractice,
    jobApplicationCount: user._count?.jobApplications ?? 0,
    counselorUnreadCount: engagement.counselorUnreadCount,
    weeklyRecapUnopened: engagement.weeklyRecapUnopened,
    careerRecommendation,
    inferredTargetRole,
    checklist,
    nextBestActions,
    stateLetter,
  };
}

export async function getMemberState(
  userId: string,
  opts: {
    b4bProgress?: LearnerProgressByContent;
    activeProgramSlug?: string | null;
  } = {},
): Promise<MemberState> {
  // Skip cache when b4bProgress is supplied (dynamic external data).
  if (opts.b4bProgress) {
    return _getMemberStateUncached(userId, opts);
  }
  const cacheKey = `member:state:${userId}:${opts.activeProgramSlug || 'default'}`;
  return getCacheOrFetch(cacheKey, () => _getMemberStateUncached(userId, opts), 300);
}

/** Invalidate member state cache for a given user. Call after mutations. */
export async function invalidateMemberState(userId: string): Promise<void> {
  await invalidateCache(`member:state:${userId}:*`);
}

export async function getMemberStateFull(userId: string): Promise<MemberStateFull> {
  const [base, fullData] = await Promise.all([
    getMemberState(userId),
    loadMemberFullContext(userId),
  ]);

  return {
    ...base,
    ...fullData,
  };
}

// ─── Full Context Loader (admin/counselor) ─────────────────────────────────
async function loadMemberFullContext(userId: string): Promise<Omit<MemberStateFull, keyof MemberState>> {
  const [placement, courseEnrollment, counselorAssignment, recentMessagesRaw, memberEvents, partnerReferral, unreadCount] = await prisma.$transaction(async (tx) => {
    const [placement, courseEnrollment, counselorAssignment, recentMessagesRaw, memberEvents, partnerReferral] = await Promise.all([
      tx.placementRecord.findUnique({
        where: { userId },
        select: {
          placedAt: true,
          retentionDecision: true,
          onboardingWindowEnd: true,
          employerName: true,
          jobTitle: true,
          salaryOffered: true,
        },
      }),
      tx.courseEnrollment.findFirst({
        where: { userId, isPrimary: true },
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true,
          enrolledByAdminId: true,
          programSlug: true,
          enrolledAt: true,
          fundingSource: true,
        },
      }),
      tx.counselorAssignment.findFirst({
        where: { memberId: userId, active: true },
        orderBy: { assignedAt: 'desc' },
        select: {
          assignedAt: true,
          counselor: {
            select: {
              user: { select: { fullName: true } },
            },
          },
        },
      }),
      tx.messageThread.findFirst({
        where: { memberId: userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          updatedAt: true,
          memberLastReadAt: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, body: true },
          },
        },
      }),
      tx.memberEvent.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          eventName: true,
          createdAt: true,
          metadata: true,
          sourcePage: true,
        },
      }),
      tx.partnerReferral.findFirst({
        where: { memberId: userId },
        orderBy: { referredAt: 'desc' },
        select: {
          partner: { select: { name: true } },
          referredAt: true,
        },
      }),
    ]);

    const messageThreadLastReadAt = recentMessagesRaw?.memberLastReadAt;
    const unreadCount = await tx.message.count({
      where: {
        thread: { memberId: userId },
        authorId: { not: userId },
        createdAt: {
          gt: messageThreadLastReadAt ?? new Date(0),
        },
      },
    });

    return [placement, courseEnrollment, counselorAssignment, recentMessagesRaw, memberEvents, partnerReferral, unreadCount] as const;
  });

  return {
    placement: placement
      ? {
          placedAt: placement.placedAt,
          retentionDecision: placement.retentionDecision,
          onboardingWindowEnd: placement.onboardingWindowEnd,
        }
      : null,
    courseEnrollment: courseEnrollment
      ? {
          enrolledByAdminId: courseEnrollment.enrolledByAdminId,
          id: courseEnrollment.id,
        }
      : null,
    counselorAssignment: counselorAssignment
      ? {
          counselorName: counselorAssignment.counselor?.user?.fullName ?? null,
          assignedAt: counselorAssignment.assignedAt,
        }
      : null,
    recentMessages: {
      unreadCount,
      lastMessageAt: recentMessagesRaw?.messages[0]?.createdAt ?? null,
    },
    memberEvents: memberEvents.map((e) => ({
      type: e.eventName,
      createdAt: e.createdAt,
      metadata: (e.metadata ?? undefined) as Record<string, unknown> | undefined,
    })),
    partnerContext: partnerReferral
      ? {
          partnerName: partnerReferral.partner.name,
          referralSource: partnerReferral.partner.name,
        }
      : null,
  };
}
