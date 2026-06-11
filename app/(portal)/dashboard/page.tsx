import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadMemberCareerBriefBundleSafe } from '@/lib/content/careerBriefPersonalization';
import { prisma } from '@/lib/db/prisma';
import { canBypassMemberAssessment, isSuperAdmin } from '@/lib/auth/roles';
import StaffViewBanner from '@/components/portal/StaffViewBanner';
import { formatPortalDate } from '@/lib/formatDate';
import MemberDashboardVoiceSectionLazy from '@/components/portal/MemberDashboardVoiceSectionLazy';
import VoiceSectionErrorBoundary from '@/components/portal/VoiceSectionErrorBoundary';
import MemberNextStepsStrip from '@/components/portal/MemberNextStepsStrip';
import MemberFirstValuePanel from '@/components/portal/MemberFirstValuePanel';
import { buildFirstValueActions } from '@/lib/member/firstValueActions';
import { isNewMember, secondsSinceAccountCreation } from '@/lib/member/isNewMember';
import MemberProgressStrip from '@/components/portal/MemberProgressStrip';
import MemberDoThisNextCard from '@/components/portal/MemberDoThisNextCard';
import MemberSessionCard from '@/components/portal/MemberSessionCard';
import MemberStuckCounselorStrip from '@/components/portal/MemberStuckCounselorStrip';
import GoalsModule from '@/components/portal/GoalsModule';
import TodayHero from '@/components/portal/TodayHero';
import { classifyMember } from '@/lib/member/atRiskScoring';
import { buildProactiveInsights } from '@/lib/member/proactiveInsights';
import { parseGoalDescription } from '@/lib/member/goalSteps';
import PortalEntryErrorBoundary from '@/components/portal/PortalEntryErrorBoundary';
import { getMemberState } from '@/lib/member/getMemberState';
import { getActiveProgramForDashboard } from '@/lib/member/getActiveProgramForDashboard';
import {
  fetchLearnerProgressFromB4B,
  type LearnerProgressByContent,
} from '@/lib/coursera/learnerProgress';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { maybeAutoSyncCourseraOnDashboard } from '@/lib/coursera/dashboardAutoSync';
import { getAIToolFollowThrough } from '@/lib/member/aiToolFollowThrough';
import { isTrainingStaleForCounselorEscalation } from '@/lib/member/memberProgramTrainingView';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import DashboardErrorFallback from '@/components/error/DashboardErrorFallback';
import { getMemberPoints } from '@/lib/member/points';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';
import { getTranslations } from 'next-intl/server';
import MobileProgramTrainingCard from './_components/MobileProgramTrainingCard';
import MobileStateANextStepCard from './_components/MobileStateANextStepCard';
import MobilePriorityActionCard from './_components/MobilePriorityActionCard';
import MobileJourneyTimeline from './_components/MobileJourneyTimeline';
import MobilePointsSection from './_components/MobilePointsSection';
import MobileDiscoverSection from './_components/MobileDiscoverSection';
import MobileQuickActions from './_components/MobileQuickActions';
import MobileRecentActivity from './_components/MobileRecentActivity';
import DesktopDashboard from './_components/DesktopDashboard';

const MemberCareerPathSection = dynamic(
  () => import('@/components/portal/MemberCareerPathSection'),
  { loading: () => null }
);
const LogCertificationModal = dynamic(() => import('./LogCertificationModal'), {
  loading: () => null,
});
const PlacementConfirmationStrip = dynamic(() => import('./PlacementConfirmationStrip'), {
  loading: () => null,
});
const PWAInstallPrompt = dynamic(() => import('@/components/pwa/PWAInstallPrompt'), {
  loading: () => null,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
  title: t('yourDashboard'),
  description: t('dashboardDescription'),
  path: '/dashboard',
});
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ program?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');
  const t = await getTranslations('dashboard');

  // Multi-program: optional `?program=<slug>` switches the home hero +
  // metric cards to a secondary enrollment. Validated server-side via
  // `getActiveProgramForDashboard` (slug must be one of the user's
  // enrollments).
  const params = await searchParams;
  const requestedProgramSlug =
    typeof params?.program === 'string' ? params.program.trim() : null;

  try {
    return await renderMemberDashboard(user, t, { requestedProgramSlug });
  } catch (err) {
    console.error('[dashboard] unhandled render error', err);
    return (
      <div className="portal-error-fallback" style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{t('errorTitle')}</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          {t('errorBody')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <a href="/dashboard" className="btn btn-primary">
            {t('tryAgain')}
          </a>
          <a href="https://www.workforceap.org/" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
            {t('waHome')}
          </a>
        </div>
      </div>
    );
  }
}

async function renderMemberDashboard(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
  args: { requestedProgramSlug: string | null } = { requestedProgramSlug: null },
) {
  const { user: dbUser, careerBrief } = await loadMemberCareerBriefBundleSafe(user.id, { activeMemberOnly: true });
  if (!dbUser) redirect('/login');

  // ── Auto-sync trigger (fire-and-await with 5s deadline; fail-soft) ──
  // First-visit members who have a Coursera identity mapping but zero local
  // CourseProgress rows get their enrollment + xAPI seeded right here so the
  // hero ring + "X of N courses" reflect real Coursera progress. Subsequent
  // renders skip via the `users.last_coursera_auto_sync_at` dedupe.
  // PR #1079 wired B4B real-time progress into /dashboard/learning; this
  // closes the equivalent gap on the home page (#1079 only enriched the
  // training page, so the home dashboard kept reading 0% from local rows
  // for any never-synced learner). See lib/coursera/dashboardAutoSync.ts.
  await maybeAutoSyncCourseraOnDashboard({
    userId: user.id,
    userEmail: user.email ?? null,
  });

  // ── Multi-program resolution ──
  // Drive the hero name + progress + selector chip from `CourseEnrollment`
  // rows (with `?program=<slug>` to pick a secondary). Reading
  // `User.enrolledProgram` directly here is what produced the
  // hero/course-list mismatch when that legacy field went stale — the
  // helper falls back to it only for never-migrated users.
  const activeProgramView = await getActiveProgramForDashboard({
    userId: user.id,
    requestedProgramSlug: args.requestedProgramSlug,
  });
  if (
    activeProgramView.legacyEnrolledProgramMismatch &&
    activeProgramView.primaryProgramSlug
  ) {
    // We do NOT auto-reconcile (admin call). Just leave a breadcrumb so
    // the drift is visible in logs and can be cleaned up by a counselor.
    console.warn(
      '[dashboard] User.enrolledProgram differs from primary CourseEnrollment',
      {
        userId: user.id,
        legacyEnrolledProgram: dbUser.enrolledProgram,
        primaryProgramSlug: activeProgramView.primaryProgramSlug,
      },
    );
  }
  const enrolledProgramSlug = activeProgramView.activeProgramSlug;

  // ── B4B authoritative progress for the hero ring ──
  // Pulled in parallel with the rest of the page data; the 60s cache in
  // learnerProgress.ts means a refresh + sub-page navigation reuses one
  // request. Failure → empty map → fall back to local rollup. No DB writes.
  const courseraProgramIdForEnrolled = enrolledProgramSlug
    ? DISCOVERED_COURSERA_PROGRAMS[enrolledProgramSlug]?.courseraProgramId
    : undefined;
  const b4bProgressPromise: Promise<LearnerProgressByContent> = user.email
    ? fetchLearnerProgressFromB4B(user.email, {
        programId: courseraProgramIdForEnrolled,
      }).catch((err) => {
        console.warn('[dashboard] B4B learner progress unavailable:', err);
        return new Map() as LearnerProgressByContent;
      })
    : Promise.resolve(new Map() as LearnerProgressByContent);
  const b4bProgress = await b4bProgressPromise;

  // Single source of truth for member state (application, training, profile, checklist, next actions).
  // `b4bProgress` is threaded through so `trainingView.progressPercentDisplay`
  // prefers Coursera B4B enrollmentReports per course when available (fallback:
  // local CourseProgress / xAPI-fed rows).
  const memberState = await getMemberState(user.id, {
    b4bProgress,
    activeProgramSlug: enrolledProgramSlug,
  });

  // Lightweight query for presentation-layer metadata not in getMemberState
  const intakePromise = prisma.user.findUnique({
    where: { id: user.id },
    select: {
      interviewEligible: true,
      interviewRequestedAt: true,
      interviewCompletedAt: true,
      preScreeningResponse: { select: { id: true } },
      onboardingCompletedAt: true,
      tourCompletedAt: true,
      assessmentCompletedAt: true,
      fullName: true,
      phone: true,
      programInterest: true,
      needsComputerSupportFollowUp: true,
      profile: {
        select: {
          city: true,
          state: true,
          zip: true,
          profilePhone: true,
          profileAddress: true,
          referralSource: true,
          dob: true,
          isMinor: true,
        },
      },
      // Multi-program: dashboard intake reads enrolledByAdminId from the
      // primary enrollment (counselor-created flag).
      courseEnrollments: {
        where: { isPrimary: true },
        select: { enrolledByAdminId: true, id: true },
        take: 1,
      },
      placementRecord: { select: { placedAt: true, retentionDecision: true, onboardingWindowEnd: true } },
    },
  });

  const [intakeResult, toolsResult, applicationResult, dynamicActionsResult, jobApplicationsResult, pointsResult, recentTxResult, sessionEventsResult, interviewPracticeCompletionResult] = await Promise.allSettled([
    intakePromise,
    prisma.aIToolResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, toolType: true, inputSummary: true, createdAt: true },
    }),
    prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        programInterest: true,
        submittedAt: true,
        createdAt: true,
      },
    }),
    prisma.memberNextBestAction.findMany({
      where: { memberId: user.id, status: 'PENDING' },
      orderBy: { priority: 'desc' },
      take: 2,
      select: {
        id: true,
        title: true,
        description: true,
        ctaHref: true,
        ctaLabel: true,
        priority: true,
      },
    }),
    prisma.jobApplication.findMany({
      take: 500,
      where: { userId: user.id, status: 'OFFER' },
      select: {
        id: true,
        company: true,
      },
    }),
    getMemberPoints(user.id),
    prisma.pointsTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, event: true, points: true, note: true, createdAt: true },
    }),
    // In-office session events ΓÇö see lib/auth/actAsSubject.ts. Pulls every
    // ai_tool_run_completed event in the last 30 days where a counselor or
    // admin acted on behalf of this member, so the dashboard can render a
    // "Your session with {actor} on {date}" card.
    prisma.memberEvent.findMany({
      where: {
        userId: user.id,
        eventName: 'ai_tool_run_completed',
        sessionId: { not: null },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { sessionId: true, entityId: true, createdAt: true, metadata: true },
    }),
    prisma.memberEvent.findFirst({
      where: { userId: user.id, eventName: 'career_os.interview_practice_completed' },
      select: { id: true },
    }),
  ]);

  const intakeExtra = intakeResult.status === 'fulfilled' ? intakeResult.value : null;
  if (intakeResult.status === 'rejected') {
    console.error('[dashboard] intake query failed', intakeResult.reason);
  }

  const careerMatchFromProfile = memberState.careerRecommendation;
  if (toolsResult.status === 'rejected') {
    console.error('[dashboard] recent AI tools query failed', toolsResult.reason);
  }

  const recentTools = toolsResult.status === 'fulfilled' ? toolsResult.value : [];
  if (applicationResult.status === 'rejected') {
    console.error('[dashboard] latest application query failed', applicationResult.reason);
  }

  const dynamicNextActions = dynamicActionsResult.status === 'fulfilled' ? dynamicActionsResult.value : [];
  if (dynamicActionsResult.status === 'rejected') {
    console.error('[dashboard] dynamic actions query failed', dynamicActionsResult.reason);
  }

  const jobOffers = jobApplicationsResult.status === 'fulfilled' ? jobApplicationsResult.value : [];

  const memberPoints = pointsResult.status === 'fulfilled' ? pointsResult.value : null;
  const recentTx = recentTxResult.status === 'fulfilled' ? recentTxResult.value : [];
  const hasCompletedInterviewPractice = interviewPracticeCompletionResult.status === 'fulfilled'
    ? !!interviewPracticeCompletionResult.value
    : false;
  if (interviewPracticeCompletionResult.status === 'rejected') {
    console.error('[dashboard] interview practice completion query failed', interviewPracticeCompletionResult.reason);
  }

  // Group on-behalf-of session events by sessionId so the dashboard can
  // render a single "Your session with {actor}" card for the most recent run.
  const sessionEvents = sessionEventsResult.status === 'fulfilled' ? sessionEventsResult.value : [];
  if (sessionEventsResult.status === 'rejected') {
    console.error('[dashboard] session events query failed', sessionEventsResult.reason);
  }
  type SessionSummary = {
    sessionId: string;
    actorName: string;
    startedAt: Date;
    toolCount: number;
    resultIds: string[];
  };
  const sessionMap = new Map<string, SessionSummary>();
  for (const ev of sessionEvents) {
    if (!ev.sessionId) continue;
    const meta = (ev.metadata ?? {}) as { runOnBehalf?: boolean; actorName?: string | null };
    if (!meta.runOnBehalf) continue;
    const existing = sessionMap.get(ev.sessionId);
    if (existing) {
      existing.toolCount += 1;
      if (ev.entityId) existing.resultIds.push(ev.entityId);
      if (ev.createdAt < existing.startedAt) existing.startedAt = ev.createdAt;
    } else {
      sessionMap.set(ev.sessionId, {
        sessionId: ev.sessionId,
        actorName: meta.actorName ?? t('yourCounselor'),
        startedAt: ev.createdAt,
        toolCount: 1,
        resultIds: ev.entityId ? [ev.entityId] : [],
      });
    }
  }
  const latestSession =
    [...sessionMap.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null;

  const latestTool = recentTools[0] ?? null;
  const latestToolFollowThrough = latestTool
    ? getAIToolFollowThrough({
        toolType: latestTool.toolType,
        inputSummary: latestTool.inputSummary,
      })
    : null;

  const showMemberOnboarding = intakeExtra?.onboardingCompletedAt == null;
  const showMemberTour =
    intakeExtra?.onboardingCompletedAt != null && intakeExtra?.tourCompletedAt == null;
  const wizardProgramInterest =
    memberState.application?.programInterest ?? intakeExtra?.programInterest ?? '';

  // ── Application status ── (from memberState, single source of truth)
  const applicationStatusView = memberState.application;
  const applicationStatus = applicationStatusView
    ? {
        label: applicationStatusView.label,
        submittedAt: applicationStatusView.submittedAt?.toISOString() ?? null,
        programInterest: applicationStatusView.programInterest,
        nextStep: applicationStatusView.nextStep,
        nextStepHref: applicationStatusView.nextStepHref,
        showResponseEstimate: applicationStatusView.showResponseEstimate,
        progressIndex: applicationStatusView.progressIndex,
        stage: applicationStatusView.stage,
      }
    : null;
  const noApplicationOnFile = !applicationStatusView;

  const firstName = dbUser.fullName?.split(' ')[0] ?? 'there';
  // Use the active program (resolved from CourseEnrollment rows above)
  // rather than `dbUser.enrolledProgram` so the hero, journey timeline,
  // and "X of N courses" all key off the same enrollment that drives
  // the course list below.
  const enrolledProgram = enrolledProgramSlug;
  const assessmentCompleted = dbUser.assessmentCompleted ?? false;
  const userAge = intakeExtra?.profile?.dob 
    ? Math.floor((Date.now() - new Date(intakeExtra.profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const isMinor = intakeExtra?.profile?.isMinor || (userAge !== null && userAge < 18);

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;

  // Multi-program: build the dropdown options for the dashboard hero.
  // Single-enrollment users see no chip — keeps the existing layout
  // unchanged. The selector reloads `/dashboard?program=<slug>` so the
  // server re-runs with a different active enrollment.
  const programSelectorOptions = activeProgramView.allEnrollments.map((e) => ({
    id: e.id,
    programSlug: e.programSlug,
    programTitle: getProgramBySlug(e.programSlug)?.title ?? e.programSlug,
    isPrimary: e.isPrimary,
  }));
  const showProgramSelector = programSelectorOptions.length > 1 && !!enrolledProgram;

  // ── Training state ── (from memberState, single source of truth)
  const trainingView = memberState.trainingView;
  const completedCount = trainingView?.completedCount ?? 0;
  const totalCourses = trainingView?.totalCourses ?? program?.courses.length ?? 0;
  const allCoursesComplete = trainingView?.allCoursesComplete ?? false;
  const progressPercentDisplay = trainingView?.progressPercentDisplay ?? 0;

  let trainingEligibleSince: Date | null = null;
  if (enrolledProgram && assessmentCompleted) {
    const enrolledMs = dbUser.enrolledAt?.getTime() ?? 0;
    const assessMs = intakeExtra?.assessmentCompletedAt?.getTime() ?? 0;
    const mx = Math.max(enrolledMs, assessMs);
    trainingEligibleSince = mx > 0 ? new Date(mx) : null;
  }

  const hasPlacementRecord = !!intakeExtra?.placementRecord?.placedAt;

  const progressStripProps = {
    intake:
      intakeExtra?.onboardingCompletedAt != null ||
      intakeExtra?.preScreeningResponse != null,
    assessment: assessmentCompleted,
    trainingStarted: trainingView?.hasStartedTraining ?? false,
    certsComplete: allCoursesComplete,
    employed: hasPlacementRecord,
  };

  // ── Dashboard state letter ── (from memberState, single source of truth)
  const dashboardState = memberState.stateLetter;

  const showStuckCounselor =
    dashboardState === 'C' &&
    trainingView != null &&
    isTrainingStaleForCounselorEscalation({
      trainingView,
      trainingEligibleSince,
      allCoursesComplete,
      dashboardInTraining: true,
    });

  // ── Profile + next actions ── (from memberState, single source of truth)
  const profileCompletenessPct = memberState.profileCompletenessPct;
  const profileMissingFields = memberState.profileMissingFields;

  let nextBestActions = memberState.nextBestActions;

  // Starter profile review (for counselor-created accounts)
  const starterProfileReview = getCounselorStarterProfileReview({
    wasCounselorCreated: !!intakeExtra?.courseEnrollments?.[0]?.enrolledByAdminId,
    phone: intakeExtra?.phone,
    profilePhone: intakeExtra?.profile?.profilePhone,
    profileAddress: intakeExtra?.profile?.profileAddress,
    city: intakeExtra?.profile?.city,
    state: intakeExtra?.profile?.state,
    zip: intakeExtra?.profile?.zip,
    referralSource: intakeExtra?.profile?.referralSource,
  });
  const starterProfileMissingLabels = getStarterProfileFieldLabels(starterProfileReview.missing);

  for (const dbAction of dynamicNextActions.reverse()) {
    nextBestActions.unshift({
      id: dbAction.id,
      title: dbAction.title,
      body: dbAction.description,
      href: dbAction.ctaHref,
      cta: dbAction.ctaLabel,
      variant: 'urgent',
      weight: dbAction.priority + 100,
    });
  }
  nextBestActions = nextBestActions.slice(0, 4);
  const dominantNextAction = nextBestActions[0] ?? null;

  const showFirstValuePanel = isNewMember(dbUser.createdAt);
  const firstValueActions = showFirstValuePanel
    ? buildFirstValueActions({
        state: dashboardState,
        noApplicationOnFile,
        application: applicationStatusView,
        enrolledProgram: enrolledProgramSlug,
        assessmentCompleted,
        hasResume: memberState.hasResume,
        profileCompletenessPct,
        careerRecommendation: memberState.careerRecommendation,
      })
    : [];
  const firstValueSecondsSinceSignup = secondsSinceAccountCreation(dbUser.createdAt);

  const mobileStripActions =
    dominantNextAction && nextBestActions[0]?.id === dominantNextAction.id
      ? nextBestActions.slice(1)
      : nextBestActions;

  const checklist = {
    createAccount: true,
    chooseProgram: !!enrolledProgram,
    completeAssessment: assessmentCompleted,
    // Milestones follow `CourseProgress` / xAPI when present, fall back to raw count.
    startFirstCourse: trainingView ? trainingView.hasStartedTraining : completedCount >= 1,
    completeFirstCourse: trainingView ? trainingView.hasCompletedFirstCourse : completedCount >= 1,
  };
  const checklistAllDone = Object.values(checklist).every(Boolean);

  const recentActivity: Array<{ label: string; timestamp: Date }> = [];
  if (dbUser.enrolledAt) {
    recentActivity.push({ label: t('enrolled'), timestamp: dbUser.enrolledAt });
  }
  if (dbUser.assessmentCompletedAt) {
    recentActivity.push({ label: t('completedAssessment'), timestamp: dbUser.assessmentCompletedAt });
  }
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastThree = recentActivity.slice(0, 3);

  const nextIncompleteCourse =
    program && trainingView?.nextIncompleteCourseSlug
      ? program.courses.find((c) => c.slug === trainingView.nextIncompleteCourseSlug) ?? null
      : program && trainingView
        ? program.courses.find((c) => !trainingView.completedSlugsAuthoritative.includes(c.slug)) ?? null
        : null;

  const recommendedActions = careerBrief.recommendedActions;
  const jobSearchUrl = careerBrief.jobSearchUrl;

  const showMatchedRoles = assessmentCompleted;
  let superAdmin = false;
  try {
    superAdmin = await isSuperAdmin(user.id);
  } catch (e) {
    console.error('[dashboard] isSuperAdmin failed', e);
  }
  let staffViewer = false;
  try {
    staffViewer = await canBypassMemberAssessment(user.id);
  } catch (e) {
    console.error('[dashboard] canBypassMemberAssessment failed', e);
  }

  /* Mobile hero uses a My Training hub link (states C/D) — training home is now /dashboard */

  const interviewCompleted = !!intakeExtra?.interviewCompletedAt;
  const interviewRequested = !!intakeExtra?.interviewRequestedAt;
  const interviewEligibleFlag = intakeExtra?.interviewEligible ?? false;
  const preScreeningDone = !!intakeExtra?.preScreeningResponse;

  // ── Today hero + proactive "we noticed…" insights ──
  // Additive layer at the top of the dashboard. We reuse data already loaded
  // above (trainingView, dbUser) and pull one lightweight query for the login
  // signal + active goals + earliest cert so the proactive cards can read the
  // retention tier without re-running the heavier at-risk pipeline.
  let todayHeroInsights: ReturnType<typeof buildProactiveInsights> = [];
  let topGoalTitle: string | null = null;
  let activeGoalCount = 0;
  let focusLine = '';
  try {
    const todayData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        lastLoginAt: true,
        staleTrainingDetectedAt: true,
        userCertifications: {
          orderBy: { earnedAt: 'asc' },
          select: { earnedAt: true },
          take: 1,
        },
        goals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { title: true, description: true },
        },
        _count: { select: { jobApplications: true } },
      },
    });

    const activeGoals = todayData?.goals ?? [];
    activeGoalCount = activeGoals.length;

    // Find the goal closest to completion (most steps done, but not finished)
    // so the proactive card + focus line can speak to real momentum.
    let topGoalStepsDone = 0;
    let topGoalStepsTotal = 0;
    let bestRatio = -1;
    for (const g of activeGoals) {
      const { steps } = parseGoalDescription(g.description);
      const total = steps.length;
      const done = steps.filter((s) => s.done).length;
      const ratio = total > 0 ? done / total : 0;
      // Prefer in-progress goals (some done, not all) for the momentum story.
      const score = total > 0 && done < total ? ratio + 0.01 : ratio;
      if (score > bestRatio) {
        bestRatio = score;
        topGoalTitle = g.title;
        topGoalStepsDone = done;
        topGoalStepsTotal = total;
      }
    }
    if (!topGoalTitle && activeGoals[0]) {
      topGoalTitle = activeGoals[0].title;
    }

    const classification = classifyMember({
      userId: user.id,
      lastLoginAt: todayData?.lastLoginAt ?? null,
      staleTrainingDetectedAt: todayData?.staleTrainingDetectedAt ?? null,
      lastTrainingActivityAt: trainingView?.lastTrainingActivityAt ?? null,
      allCoursesComplete,
      earliestCertEarnedAt: todayData?.userCertifications?.[0]?.earnedAt ?? null,
      jobApplicationCount: todayData?._count.jobApplications ?? 0,
    });

    todayHeroInsights = buildProactiveInsights({
      firstName,
      riskTier: classification.tier,
      daysSinceLogin: classification.daysSinceLogin,
      riskReasons: classification.reasons,
      enrolledProgram: !!enrolledProgram,
      totalCourses,
      completedCourses: completedCount,
      allCoursesComplete,
      progressPercentDisplay,
      activeGoalCount,
      topGoalTitle,
      topGoalStepsDone,
      topGoalStepsTotal,
    });
  } catch (err) {
    console.error('[dashboard] today hero signals failed', err);
  }

  // Derive a single warm "your focus today" line. Priority: the most urgent
  // next-best-action, then an active goal, then a gentle default — never blank.
  if (dominantNextAction) {
    focusLine = dominantNextAction.title;
  } else if (topGoalTitle) {
    focusLine = `Keep moving on “${topGoalTitle}”.`;
  } else if (noApplicationOnFile) {
    focusLine = 'Start your application — it takes about 10 minutes.';
  } else if (enrolledProgram && !allCoursesComplete) {
    focusLine = nextIncompleteCourse
      ? `Continue ${nextIncompleteCourse.name}.`
      : 'Continue your training today.';
  } else {
    focusLine = 'Explore your tools or message your counselor for a next step.';
  }

  const todayHeroContextLine = program
    ? `${program.title}${
        enrolledProgram && totalCourses > 0 && !allCoursesComplete
          ? ` · ${completedCount} of ${totalCourses} courses`
          : ''
      }`
    : null;

  const todayHero = (
    <ErrorBoundary fallback={null}>
      <TodayHero
        firstName={firstName}
        dateLabel={formatPortalDate(new Date())}
        isNewMember={noApplicationOnFile}
        focusLine={focusLine}
        contextLine={todayHeroContextLine}
        insights={todayHeroInsights}
      />
    </ErrorBoundary>
  );

  return (
    <>
      <h1 className="wa-sr-only">{noApplicationOnFile ? `Welcome to WorkforceAP, ${firstName}` : `Welcome back, ${firstName}`}</h1>

      <PWAInstallPrompt />

      {staffViewer && (
        <div style={{ padding: '0.75rem 1rem 0' }}>
          <StaffViewBanner page="dashboard" />
        </div>
      )}

      {/* ΓöÇΓöÇ Recent in-office session card — shown to both mobile + desktop
          when a counselor or admin ran tools on the member's behalf in the
          last 30 days. See lib/auth/actAsSubject.ts. ΓöÇΓöÇ */}
      {latestSession ? (
        <MemberSessionCard
          actorName={latestSession.actorName}
          startedAt={latestSession.startedAt}
          toolCount={latestSession.toolCount}
        />
      ) : null}

      {/* ΓöÇΓöÇ Mobile-only dashboard (Γëñ767px) ΓöÇΓöÇ */}
      <div className="md:wa-hidden portal-mobile-content">

        {/* Personalized Today hero — additive layer above the existing hero. */}
        <section style={{ padding: '1.25rem 1.25rem 0' }}>{todayHero}</section>

        {showFirstValuePanel && firstValueActions.length > 0 ? (
          <section style={{ padding: '1rem 1.25rem 0' }}>
            <MemberFirstValuePanel
              actions={firstValueActions}
              secondsSinceSignup={firstValueSecondsSinceSignup}
            />
          </section>
        ) : null}

        {/* Program & training context - see _components/MobileProgramTrainingCard */}
        <MobileProgramTrainingCard
          t={t}
          programTitle={program?.title ?? null}
          showProgramSelector={showProgramSelector}
          enrolledProgram={enrolledProgram}
          programSelectorOptions={programSelectorOptions}
          dashboardState={dashboardState}
          nextIncompleteCourseName={nextIncompleteCourse?.name ?? null}
        />

        {/* State A: unmissable next-step CTA - shown before voice section when member hasn't enrolled */}
        {dashboardState === 'A' && (
          <MobileStateANextStepCard t={t} noApplicationOnFile={noApplicationOnFile} />
        )}

        {showStuckCounselor && (
          <section aria-label="Counselor help" style={{ padding: '0 1.25rem 0.75rem' }}>
            <MemberStuckCounselorStrip />
          </section>
        )}

        {dashboardState !== 'A' && dominantNextAction ? (
          <ErrorBoundary fallback={<DashboardErrorFallback section="activity" />}>
            <MemberDoThisNextCard action={dominantNextAction} paddingX="1.25rem" />
          </ErrorBoundary>
        ) : null}

        {(dashboardState === 'C' || dashboardState === 'D') && (
          <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
            <section aria-label="Progress overview" style={{ padding: '0 1.5rem 1rem' }}>
              <MemberProgressStrip {...progressStripProps} />
            </section>
          </ErrorBoundary>
        )}

        <ErrorBoundary fallback={<DashboardErrorFallback section="training" />}>
          <section aria-label="Certifications" style={{ padding: '0 1.25rem 0.75rem' }}>
            <LogCertificationModal />
          </section>
        </ErrorBoundary>

        {dashboardState !== 'A' && !dominantNextAction && mobileStripActions.length > 0 && (
          <ErrorBoundary fallback={<DashboardErrorFallback section="activity" />}>
            <section aria-label="Next actions" style={{ padding: '0 1.25rem 1rem' }}>
              <MemberNextStepsStrip actions={mobileStripActions} compact fillRow />
            </section>
          </ErrorBoundary>
        )}

        {/* ΓöÇΓöÇ Priority next-step card ΓöÇΓöÇ */}
        <ErrorBoundary fallback={<DashboardErrorFallback section="activity" />}>
          <PlacementConfirmationStrip offers={jobOffers} />
        </ErrorBoundary>
        {!dominantNextAction && applicationStatus?.nextStep && (
          <MobilePriorityActionCard
            t={t}
            applicationStatus={applicationStatus}
            programTitle={program?.title ?? null}
          />
        )}

        {/* ΓöÇΓöÇ Career path ΓöÇΓöÇ */}
        <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
          <div role="region" aria-label="Career path" style={{ padding: '0 1.25rem', marginBottom: '0.5rem' }}>
            <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
          </div>
        </ErrorBoundary>

        {/* ΓöÇΓöÇ Goals ΓåÆ steps ΓöÇΓöÇ */}
        <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
          <section id="goals" aria-label="Goals" style={{ padding: '0 1.25rem', marginBottom: '0.85rem', scrollMarginTop: '5rem' }}>
            <GoalsModule />
          </section>
        </ErrorBoundary>

        {/* Application journey timeline */}
        <MobileJourneyTimeline
          t={t}
          enrolledProgram={enrolledProgram}
          noApplicationOnFile={noApplicationOnFile}
          assessmentCompleted={assessmentCompleted}
          interviewCompleted={interviewCompleted}
          interviewRequested={interviewRequested}
          interviewEligibleFlag={interviewEligibleFlag}
          preScreeningDone={preScreeningDone}
          completedCount={completedCount}
          allCoursesComplete={allCoursesComplete}
        />

        {/* Points widget */}
        <MobilePointsSection t={t} memberPoints={memberPoints} recentTx={recentTx} />

        {/* Recommended programs (when not enrolled) OR next-milestone actions (when enrolled) */}
        <MobileDiscoverSection
          t={t}
          enrolledProgram={enrolledProgram}
          programTitle={program?.title ?? null}
          nextIncompleteCourseName={nextIncompleteCourse?.name ?? null}
        />

        {/* Quick Actions 2x2 */}
        <MobileQuickActions t={t} />

        <VoiceSectionErrorBoundary>
          <section aria-label="Career voice assistant" style={{ padding: '0 1.25rem 1.25rem' }}>
            <MemberDashboardVoiceSectionLazy />
          </section>
        </VoiceSectionErrorBoundary>

        {/* Recent AI Activity - mobile */}
        <MobileRecentActivity t={t} recentTools={recentTools} />
      </div>

      {/* Desktop view (hidden on mobile) - extracted to _components/DesktopDashboard */}
      <DesktopDashboard
        userId={user.id}
        showMemberOnboarding={showMemberOnboarding}
        showMemberTour={showMemberTour}
        superAdmin={superAdmin}
        intakeExtra={intakeExtra}
        wizardProgramInterest={wizardProgramInterest}
        todayHero={todayHero}
        showProgramSelector={showProgramSelector}
        enrolledProgram={enrolledProgram}
        programSelectorOptions={programSelectorOptions}
        recommendedActions={recommendedActions}
        jobSearchUrl={jobSearchUrl}
        aiToolsUsedCount={recentTools.length}
        firstName={firstName}
        dominantNextAction={dominantNextAction}
        showStuckCounselor={showStuckCounselor}
        progressPercentDisplay={progressPercentDisplay}
        nextBestActions={nextBestActions}
        assessmentCompleted={assessmentCompleted}
        starterProfileReviewRequired={starterProfileReview.required}
        starterProfileMissingLabels={starterProfileMissingLabels}
        dashboardState={dashboardState}
        programTitle={program?.title}
        enrolledAt={dbUser.enrolledAt}
        assessmentScorePct={dbUser.assessmentScorePct}
        completedCount={completedCount}
        totalCourses={totalCourses}
        nextMilestone={nextIncompleteCourse?.name}
        lastThree={lastThree}
        checklist={checklist}
        checklistAllDone={checklistAllDone}
        applicationStatus={applicationStatus}
        noApplicationOnFile={noApplicationOnFile}
        userAge={userAge}
        isMinor={isMinor}
        showFirstValuePanel={showFirstValuePanel}
        firstValueActions={firstValueActions}
        firstValueSecondsSinceSignup={firstValueSecondsSinceSignup}
        progressStripProps={progressStripProps}
        careerMatchFromProfile={careerMatchFromProfile}
        memberPoints={memberPoints}
        recentTx={recentTx}
        jobOffers={jobOffers}
        showMatchedRoles={showMatchedRoles}
      />

      {/* Bottom nav ΓÇö mobile only */}    </>
  );
}
