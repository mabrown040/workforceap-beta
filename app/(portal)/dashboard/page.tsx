import { Suspense } from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getProgramBySlug, PROGRAMS } from '@/lib/content/programs';
import { loadMemberCareerBriefBundleSafe } from '@/lib/content/careerBriefPersonalization';
import { prisma } from '@/lib/db/prisma';
import DashboardHomeClient from '@/components/portal/DashboardHomeClient';
import type { CareerMatchResult } from '@/lib/onet/types';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { canBypassMemberAssessment, isSuperAdmin } from '@/lib/auth/roles';
import StaffViewBanner from '@/components/portal/StaffViewBanner';
import { MEMBER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
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
import DashboardProgramSelector from '@/components/portal/DashboardProgramSelector';
import {
  fetchLearnerProgressFromB4B,
  type LearnerProgressByContent,
} from '@/lib/coursera/learnerProgress';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { maybeAutoSyncCourseraOnDashboard } from '@/lib/coursera/dashboardAutoSync';
import { getAIToolFollowThrough } from '@/lib/member/aiToolFollowThrough';
import { isTrainingStaleForCounselorEscalation } from '@/lib/member/memberProgramTrainingView';
import { stripMarkdownForPreview } from '@/lib/text/stripMarkdown';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import JobsSkeleton from '@/components/dashboard/JobsSkeleton';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import DashboardErrorFallback from '@/components/error/DashboardErrorFallback';
import RequestHelpButton from '@/components/portal/RequestHelpButton';
import MemberFeedbackButton from '@/components/portal/MemberFeedbackButton';
import { getMemberPoints } from '@/lib/member/points';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';
import { getTranslations } from 'next-intl/server';

const MemberCareerPathSection = dynamic(
  () => import('@/components/portal/MemberCareerPathSection'),
  { loading: () => null }
);
const MatchedRoles = dynamic(() => import('@/components/portal/MatchedRoles'), {
  loading: () => <JobsSkeleton count={4} />,
});
const LogCertificationModal = dynamic(() => import('./LogCertificationModal'), {
  loading: () => null,
});
const PlacementConfirmationStrip = dynamic(() => import('./PlacementConfirmationStrip'), {
  loading: () => null,
});
const PointsWidget = dynamic(() => import('@/components/portal/PointsWidget'), {
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

  const AI_TOOL_LABELS: Record<string, string> = {
    job_match_scorer: t('seeHowYouMatch'),
    resume_analysis: t('resumeAnalysis'),
    resume_rewriter: t('resumeRewriter'),
    cover_letter: t('coverLetter'),
    interview_practice: t('interviewPractice'),
    linkedin_headline: t('linkedinHeadline'),
    linkedin_about: t('linkedinAbout'),
    salary_negotiation: t('salaryNegotiation'),
    gap_analyzer: t('seeWhatIsMissing'),
    interview_coach: t('aiInterviewCoach'),
    career_counselor: t('careerCounselor'),
  };

  const interviewCompleted = !!intakeExtra?.interviewCompletedAt;
  const interviewRequested = !!intakeExtra?.interviewRequestedAt;
  const interviewEligibleFlag = intakeExtra?.interviewEligible ?? false;
  const preScreeningDone = !!intakeExtra?.preScreeningResponse;

  const mobileCarouselCardWidth = 'min(240px, calc(100vw - 3rem))';

  /* Journey timeline — complete / active (next) / locked (future) */
  const journeySteps = [
    {
      label: t('journeyProgramSelected'),
      done: !!enrolledProgram,
      active: !enrolledProgram,
      locked: false,
      detail: enrolledProgram ? t('programOnFile') : noApplicationOnFile ? t('startApplication') : t('chooseProgram'),
    },
    {
      label: t('journeySkillsAssessment'),
      done: assessmentCompleted,
      active: !!enrolledProgram && !assessmentCompleted,
      locked: !enrolledProgram,
      detail: assessmentCompleted ? t('progressCompleted') : enrolledProgram ? t('completeToStartTraining') : t('waitingForEnrollment'),
    },
    {
      label: t('journeyInterview'),
      done: interviewCompleted,
      active:
        assessmentCompleted &&
        !interviewCompleted &&
        (interviewRequested || interviewEligibleFlag),
      locked:
        !assessmentCompleted ||
        (assessmentCompleted &&
          !interviewCompleted &&
          !interviewRequested &&
          !interviewEligibleFlag),
      detail: interviewCompleted
        ? t('interviewComplete')
        : interviewRequested
          ? t('interviewScheduled')
          : interviewEligibleFlag
            ? t('requestOrAttendInterview')
            : preScreeningDone
              ? t('preScreeningSubmitted')
              : t('submitPreScreening'),
    },
    {
      label: t('journeyFirstCourse'),
      done: completedCount > 0,
      active:
        !!enrolledProgram &&
        assessmentCompleted &&
        completedCount === 0 &&
        (!interviewEligibleFlag || interviewCompleted),
      locked:
        !enrolledProgram ||
        !assessmentCompleted ||
        (interviewEligibleFlag && !interviewCompleted),
      detail:
        completedCount > 0
          ? allCoursesComplete
            ? t('allCoursesComplete')
            : t('coursesCompleteDetail', { count: completedCount, plural: completedCount === 1 ? '' : 's' })
          : enrolledProgram && assessmentCompleted
            ? interviewEligibleFlag && !interviewCompleted
              ? t('completeInterviewFirst')
              : t('openFirstCourse')
            : t('completePriorStepsFirst'),
    },
  ];

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

        {/* ΓöÇΓöÇ Hero: greeting + progress ring ΓöÇΓöÇ */}
        <section aria-label="Dashboard hero" style={{ padding: '1.25rem 1.25rem 1rem' }}>
          <div
            style={{
              borderRadius: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, var(--surface-container-lowest)) 0%, var(--surface-container-lowest) 52%)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 14%, var(--outline-variant))',
              boxShadow: '0 16px 40px rgba(17, 24, 39, 0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '-2.5rem',
                right: '-2rem',
                width: '8rem',
                height: '8rem',
                borderRadius: '999px',
                background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 18%, transparent) 0%, transparent 68%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.9rem', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, minWidth: 0, paddingRight: '0.25rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', padding: '0.35rem 0.55rem', borderRadius: '999px', background: 'color-mix(in srgb, var(--surface-container-lowest) 80%, transparent)', border: '1px solid var(--outline-variant)' }}>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                    {formatPortalDate(new Date())}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent-dark)' }}>
                    {noApplicationOnFile ? t('workforceAP') : t('memberDashboard')}
                  </p>
                  <h2 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', margin: '0.2rem 0 0', lineHeight: 1.1 }}>
                    {noApplicationOnFile ? t('welcomeFirstName', { firstName }) : t('welcomeBackFirstName', { firstName })}
                  </h2>
                </div>
                {program && (
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', maxWidth: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.9rem', background: 'color-mix(in srgb, var(--surface-container-lowest) 90%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 10%, var(--outline-variant))' }}>
                    <p style={{ fontSize: '0.76rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.35, fontWeight: 600 }}>
                      {program.title}
                    </p>
                  </div>
                )}
                {showProgramSelector && enrolledProgram && (
                  <DashboardProgramSelector
                    options={programSelectorOptions}
                    activeProgramSlug={enrolledProgram}
                  />
                )}
              </div>

              {/* Training hub CTA — course-level % and Coursera live on My Training */}
              {(dashboardState === 'C' || dashboardState === 'D') && (
                <div
                  style={{
                    flexShrink: 0,
                    width: '7.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '0.5rem',
                  }}
                >
                  <Link
                    href="/dashboard/learning"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.5rem',
                      borderRadius: '1rem',
                      background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 12%, var(--surface-container-lowest)) 0%, var(--surface-container-lowest) 100%)',
                      border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--outline-variant))',
                      boxShadow: '0 10px 28px color-mix(in srgb, var(--color-accent) 12%, transparent)',
                      textDecoration: 'none',
                      color: 'inherit',
                      textAlign: 'center',
                      minHeight: '44px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                      school
                    </span>
                    <span className="wa-text-[11px] wa-font-extrabold wa-uppercase wa-tracking-[0.08em] wa-text-[var(--color-accent-dark)]" style={{ lineHeight: 1.2 }}>
                      {t('myTrainingMetricLabel')}
                    </span>
                    <span className="wa-text-[10px] wa-font-semibold wa-text-[var(--color-on-surface-variant)]" style={{ lineHeight: 1.3 }}>
                      {t('myTrainingMetricValue')}
                    </span>
                  </Link>
                  {nextIncompleteCourse ? (
                    <p style={{ margin: 0, fontSize: '0.65rem', lineHeight: 1.35, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                      {t('myTrainingHubNextUp', { course: nextIncompleteCourse.name })}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {(dashboardState === 'C' || dashboardState === 'D') && (
            <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 78%, var(--surface-container-lowest))' }}>
              <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]" style={{ margin: 0, lineHeight: 1.5 }}>
                {t('dashboardCourseProgressOnTraining')}
              </p>
            </div>
            )}
          </div>
        </section>

        {/* ΓöÇΓöÇ State A: unmissable next-step CTA — shown before voice section when member hasn't enrolled ΓöÇΓöÇ */}
        {dashboardState === 'A' && (
          <section aria-label="Next step" style={{ padding: '0 1.25rem 1.25rem' }}>
            <Link
              href={noApplicationOnFile ? '/apply' : '/dashboard/program'}
              style={{
                display: 'block',
                borderRadius: '1rem',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
                boxShadow: '0 6px 24px color-mix(in srgb, var(--color-accent) 28%, transparent)',
                padding: '1.25rem',
                textDecoration: 'none',
              }}
            >
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.78)', margin: '0 0 0.4rem' }}>
                {t('yourNextStep')}
              </p>
              <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                {noApplicationOnFile
                  ? t('applyNowTenMinutes')
                  : t('chooseYourProgram')}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                {noApplicationOnFile
                  ? t('careerTrainingNoCost')
                  : t('pickCareerTrack')}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fff', color: 'var(--color-accent)', padding: '0.75rem 1.25rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <span>{noApplicationOnFile ? t('startApplication') : t('chooseProgramBtn')}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
              </div>
            </Link>
          </section>
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
          <section aria-label="Priority action" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ borderRadius: '1rem', overflow: 'hidden', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', boxShadow: '0 6px 24px color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.82)', margin: '0 0 0.35rem' }}>Priority Action</p>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                      {applicationStatus.nextStep}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined wa-text-xl" style={{ color: 'var(--color-gold)', '--ms-fill': 1 }} aria-hidden>bolt</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: 1.5 }}>
                  For {program?.title ?? applicationStatus.programInterest ?? 'your program'}.
                </p>
                <Link
                  href={applicationStatus.nextStepHref}
                  style={{ display: 'block', width: '100%', background: '#fff', color: 'var(--color-accent)', padding: '0.75rem', borderRadius: '0.625rem', textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', boxSizing: 'border-box', minHeight: '44px' }}
                >
                  {t('takeAction')}
                </Link>
              </div>
            </div>
          </section>
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

        {/* ΓöÇΓöÇ Application journey timeline ΓöÇΓöÇ */}
        <section aria-label="Application journey" style={{ padding: '0 1.25rem', marginBottom: '0.85rem' }}>
          <details className="portal-card portal-card--flat" style={{ borderRadius: '0.875rem', padding: '0.95rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
              {t('applicationJourney')}
            </summary>
            <div className="portal-journey-timeline" style={{ marginTop: '1rem' }}>
              {journeySteps.map((step, i) => {
                const locked = 'locked' in step && step.locked;
                return (
                  <div key={i} className="portal-journey-step" style={{ opacity: locked ? 0.42 : 1 }}>
                    <div className={`portal-journey-step__dot portal-journey-step__dot--${step.done ? 'done' : step.active ? 'active' : 'locked'}`}>
                      {step.done && (
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '0.75rem', fontVariationSettings: "'FILL' 1" }}>check</span>
                      )}
                      {step.active && !step.done && <div className="portal-dot-pulse" />}
                    </div>
                    <div className="portal-journey-step__content">
                      <p className={`portal-journey-step__label${step.active && !step.done ? ' portal-journey-step__label--active' : ''}`}>
                        {step.label}
                      </p>
                      {step.detail && <p className="portal-journey-step__detail">{step.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </section>

        {/* ΓöÇΓöÇ Points widget ΓöÇΓöÇ */}
        <ErrorBoundary fallback={<DashboardErrorFallback section="points" />}>
          <section aria-label="Points and rewards" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            {memberPoints ? (
              <PointsWidget
                total={memberPoints.total}
                level={memberPoints.level}
                recent={recentTx}
              />
          ) : (
            <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: '0.875rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('yourFirstPointsWaiting')}</p>
              <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
                {t('earnPointsDescription')}
              </p>
              <Link href="/dashboard/ai-tools/resume-rewriter" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t('uploadImproveResume')}
              </Link>
              <Link
                href="/dashboard/points"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginTop: '0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  textDecoration: 'none',
                }}
              >
                How to earn points
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          )}
          </section>
        </ErrorBoundary>

        {/* Recommended programs (only when not enrolled) OR ΓÇ£keep goingΓÇ¥ actions (when enrolled) */}
        {!enrolledProgram ? (
          <section aria-label="Recommended programs" style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
              <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">{t('recommendedPrograms')}</h3>
              <a href="/programs" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration:"none" }}>{t('viewAll')}</a>
            </div>
            <div style={{ display:"flex", gap:"1rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
              {PROGRAMS.slice(0, 3).map((prog, i) => (
                <Link
                  key={i}
                  href={prog.slug ? `/programs/${prog.slug}` : '/programs'}
                  style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
                >
                <div
                  className="portal-card portal-card--flat"
                  style={{
                    width: mobileCarouselCardWidth,
                    minWidth: mobileCarouselCardWidth,
                    overflow:"hidden",
                    flexShrink:0,
                    background:"var(--surface-container-lowest)",
                    borderRadius:"0.75rem",
                  }}
                >
                  <div style={{ height:"7rem", position:"relative", background: `linear-gradient(135deg, ${prog.categoryColor} 0%, var(--surface-container-highest) 100%)` }} />
                  <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.25rem" }}>
                    <p className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-widest" style={{ color: 'var(--color-gold)' }}>{prog.partner || t('workforceAP')}</p>
                    <h3 className="wa-font-bold wa-text-sm wa-text-[var(--color-on-surface)] wa-leading-tight">{prog.title}</h3>
                  </div>
                </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section aria-label="Next milestones" style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
              <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">
                {t('nextMilestones')}
              </h3>
              <a href="/dashboard/learning" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration:"none" }}>
                {t('trainingLink')}
              </a>
            </div>
            <div style={{ display:"flex", gap:"0.75rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
              {[
                {
                  eyebrow: program?.title ?? t('yourProgram'),
                  title: nextIncompleteCourse?.name ? `Continue: ${nextIncompleteCourse.name}` : t('continueTraining'),
                  desc: nextIncompleteCourse?.name ? t('pickUpWhereLeftOff') : t('openTrainingTrack'),
                  href: '/dashboard/learning',
                  icon: 'school',
                },
                {
                  eyebrow: t('jobSearchTools'),
                  title: t('practiceInterviewAnswers'),
                  desc: t('buildConfidenceInterview'),
                  href: '/dashboard/ai-tools/interview-practice',
                  icon: 'record_voice_over',
                },
                {
                  eyebrow: t('connect'),
                  title: t('browseJobBoard'),
                  desc: t('exploreRoles'),
                  href: '/dashboard/jobs',
                  icon: 'work',
                },
              ].map((card) => (
                <a
                  key={card.href}
                  href={card.href}
                  className="wa-no-underline active:scale-[0.98] wa-transition-transform"
                  style={{ width: mobileCarouselCardWidth, minWidth: mobileCarouselCardWidth, flexShrink:0 }}
                >
                  <div className="portal-card portal-card--flat" style={{ borderRadius:"0.75rem" }}>
                    <div className="portal-card__body" style={{ padding:"1rem" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.75rem" }}>
                        <div style={{ minWidth:0 }}>
                          <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest" style={{ color:'var(--color-on-surface-variant)', margin:0 }}>
                            {card.eyebrow}
                          </p>
                          <p className="wa-text-sm wa-font-bold wa-tracking-tight" style={{ color:'var(--color-on-surface)', margin:"0.35rem 0 0" }}>
                            {card.title}
                          </p>
                        </div>
                        <span className="material-symbols-outlined" style={{ color:'var(--color-accent)', fontSize:"1.1rem", flexShrink:0 }}>
                          {card.icon}
                        </span>
                      </div>
                      <p className="wa-text-xs" style={{ color:'var(--color-on-surface-variant)', margin:"0.5rem 0 0", lineHeight:1.4 }}>
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ΓöÇΓöÇ Quick Actions 2x2 ΓöÇΓöÇ */}
        <section aria-label="Quick actions" style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-dash-section-header__title">{t('quickActions')}</h3>
          </div>
          <div className="portal-quick-grid-2x2">
            {([
              { icon: 'school', label: t('myTrainingMetricLabel'), href: '/dashboard/learning' },
              { icon: 'upload_file', label: t('uploadResume'), href: '/dashboard/ai-tools/resume-rewriter' },
              { icon: 'forum', label: t('interviewPrep'), href: '/dashboard/ai-tools/interview-practice' },
              { icon: 'auto_awesome', label: t('aiTools'), href: '/dashboard/ai-tools' },
            ] as const).map((action) => (
              <a key={action.label} href={action.href} className="portal-quick-grid-item">
                <div className="portal-quick-grid-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                </div>
                <span className="portal-quick-grid-item__label">{action.label}</span>
              </a>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <RequestHelpButton />
            <MemberFeedbackButton />
          </div>
        </section>

        <VoiceSectionErrorBoundary>
          <section aria-label="Career voice assistant" style={{ padding: '0 1.25rem 1.25rem' }}>
            <MemberDashboardVoiceSectionLazy />
          </section>
        </VoiceSectionErrorBoundary>

        {/* ΓöÇΓöÇ Recent AI Activity — mobile ΓöÇΓöÇ */}
        <section style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }} aria-label={t('recentAIActivity')}>
          <div className="portal-dash-section-header">
            <h3 className="portal-dash-section-header__title">{t('recentAIActivity')}</h3>
            {recentTools.length > 0 && <Link href="/dashboard/ai-tools/history" className="portal-dash-section-header__action">{t('viewAllLower')}</Link>}
          </div>
          {recentTools.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentTools.map((r) => (
                <div key={r.id} className="portal-activity-item">
                  <div className="portal-activity-item__icon">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">smart_toy</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>
                      {AI_TOOL_LABELS[r.toolType] ?? r.toolType}
                    </p>
                    {r.inputSummary && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stripMarkdownForPreview(r.inputSummary)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {formatPortalDate(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: '0.875rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('notUsedCareerToolYet')}</p>
              <p style={{ margin: '0.35rem 0 0.75rem', fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>
                {t('tryOneShortTool')}
              </p>
              <Link href="/dashboard/ai-tools/resume-rewriter" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t('tryResumeTool')}
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ΓöÇΓöÇ Desktop view (hidden on mobile) ΓöÇΓöÇ */}
      <div className="wa-hidden md:wa-block">
        <PortalEntryErrorBoundary>
          <Suspense fallback={<DashboardSkeleton />}>
            <PortalEntryClient
              portal="member"
              tourStorageUserId={user.id}
              showOnboardingWizard={showMemberOnboarding}
              showTour={showMemberTour}
              isSuperAdmin={superAdmin}
              tourSteps={MEMBER_PORTAL_TOUR_STEPS}
              wizardProps={{
                initialFullName: intakeExtra?.fullName ?? '',
                initialPhone: intakeExtra?.profile?.profilePhone ?? intakeExtra?.phone ?? '',
                initialAddress: intakeExtra?.profile?.profileAddress ?? '',
                initialCity: intakeExtra?.profile?.city ?? '',
                initialState: intakeExtra?.profile?.state ?? '',
                initialZip: intakeExtra?.profile?.zip ?? '',
                initialProgramInterest: wizardProgramInterest,
                initialReferralSource: intakeExtra?.profile?.referralSource ?? '',
              }}
            >
              {/* Personalized Today hero — additive layer above the existing
                  desktop dashboard home. */}
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.25rem 2rem 0' }}>
                {todayHero}
              </div>
              {showProgramSelector && enrolledProgram && (
                <div
                  style={{
                    maxWidth: 1200,
                    margin: '0 auto',
                    padding: '0.75rem 2rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    Active program
                  </span>
                  <DashboardProgramSelector
                    options={programSelectorOptions}
                    activeProgramSlug={enrolledProgram}
                  />
                </div>
              )}
              <ErrorBoundary fallback={<DashboardErrorFallback section="profile" />}>
                <Suspense fallback={<DashboardSkeleton />}>
                  <DashboardHomeClient
                  recommendedActions={recommendedActions}
                  jobSearchUrl={jobSearchUrl}
                  aiToolsUsedCount={recentTools.length}
                  firstName={firstName}
                  dominantNextAction={dominantNextAction}
                  showStuckCounselorStrip={showStuckCounselor}
                  blendedTrainingProgressPct={progressPercentDisplay}
                  nextBestActions={nextBestActions}
                  assessmentDone={assessmentCompleted}
                  preScreeningDone={!!intakeExtra?.preScreeningResponse}
                  interviewEligible={intakeExtra?.interviewEligible ?? false}
                  interviewRequestedAt={intakeExtra?.interviewRequestedAt ?? null}
                  interviewCompletedAt={intakeExtra?.interviewCompletedAt ?? null}
                  starterProfileReviewRequired={starterProfileReview.required}
                  starterProfileMissingFields={starterProfileMissingLabels}
                  state={dashboardState}
                  programTitle={program?.title}
                  enrolledAt={dbUser.enrolledAt}
                  assessmentScorePct={dbUser.assessmentScorePct}
                  completedCount={completedCount}
                  totalCourses={totalCourses}
                  nextMilestone={nextIncompleteCourse?.name}
                  recentActivity={lastThree}
                  checklist={checklist}
                  checklistAllDone={checklistAllDone}
                  applicationStatus={applicationStatus}
                  noApplicationOnFile={noApplicationOnFile}
                  age={userAge}
                  isMinor={isMinor}
                  showFirstValuePanel={showFirstValuePanel}
                  firstValueActions={firstValueActions}
                  firstValueSecondsSinceSignup={firstValueSecondsSinceSignup}
                  />
                </Suspense>
              </ErrorBoundary>
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem 1.5rem' }}>
                <VoiceSectionErrorBoundary>
                  <MemberDashboardVoiceSectionLazy />
                </VoiceSectionErrorBoundary>
              </div>
              <div
                style={{
                  maxWidth: 1200,
                  margin: '0 auto',
                  padding: '0 2rem 1.25rem',
                }}
              >
                <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
                  <MemberProgressStrip {...progressStripProps} />
                </ErrorBoundary>
              </div>
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem 0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <RequestHelpButton />
                <MemberFeedbackButton />
              </div>
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
                <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
                  <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
                </ErrorBoundary>
                <ErrorBoundary fallback={<DashboardErrorFallback section="progress" />}>
                  <div id="goals" role="region" aria-label="Goals" style={{ maxWidth: 520, marginBottom: 'var(--space-6)', scrollMarginTop: '5rem' }}>
                    <GoalsModule />
                  </div>
                </ErrorBoundary>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
                  <div style={{ maxWidth: '300px' }}>
                    <ErrorBoundary fallback={<DashboardErrorFallback section="training" />}>
                      <LogCertificationModal />
                    </ErrorBoundary>
                  </div>
                  {memberPoints && (
                    <div style={{ flex: '1 1 280px', maxWidth: '340px' }}>
                      <PointsWidget total={memberPoints.total} level={memberPoints.level} recent={recentTx} />
                    </div>
                  )}
                </div>
              </div>
              <ErrorBoundary fallback={<DashboardErrorFallback section="activity" />}>
                <PlacementConfirmationStrip offers={jobOffers} />
              </ErrorBoundary>
              {showMatchedRoles && userAge !== null && userAge < 14 ? null : (
                <ErrorBoundary fallback={<DashboardErrorFallback section="jobs" />}>
                  <Suspense fallback={<JobsSkeleton count={4} />}>
                    <MatchedRoles />
                  </Suspense>
                </ErrorBoundary>
              )}
              {/* Recent AI Activity is rendered in the mobile view above ΓÇö
                  suppressed here so the same data doesn't appear twice in the DOM
                  on wider viewports. DashboardHomeClient surfaces activity inline. */}
            </PortalEntryClient>
          </Suspense>
        </PortalEntryErrorBoundary>
      </div>

      {/* Bottom nav ΓÇö mobile only */}    </>
  );
}
