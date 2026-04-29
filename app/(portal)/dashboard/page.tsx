import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getProgramBySlug, PROGRAMS } from '@/lib/content/programs';
import { loadMemberCareerBriefBundleSafe } from '@/lib/content/careerBriefPersonalization';
import { prisma } from '@/lib/db/prisma';
import { buildMemberApplicationStatusView } from '@/lib/member/memberApplicationStatus';
import DashboardHomeClient from '@/components/portal/DashboardHomeClient';
import MemberCareerPathSection from '@/components/portal/MemberCareerPathSection';
import type { CareerMatchResult } from '@/lib/onet/types';
import MatchedRoles from '@/components/portal/MatchedRoles';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { MEMBER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';
import { formatPortalDate } from '@/lib/formatDate';
import MemberDashboardVoiceSectionLazy from '@/components/portal/MemberDashboardVoiceSectionLazy';
import MemberNextStepsStrip from '@/components/portal/MemberNextStepsStrip';
import MemberSessionCard from '@/components/portal/MemberSessionCard';
import PortalEntryErrorBoundary from '@/components/portal/PortalEntryErrorBoundary';
import { getMemberEngagementSignals } from '@/lib/member/memberEngagementSignals';
import { buildNextBestActions } from '@/lib/member/nextBestActions';
import { getProfileCompleteness, getProfileMissingFields } from '@/lib/resume/profileCompleteness';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { stripMarkdownForPreview } from '@/lib/text/stripMarkdown';
import PortalLoadingState from '@/components/portal/PortalLoadingState';
import LogCertificationModal from './LogCertificationModal';
import PlacementConfirmationStrip from './PlacementConfirmationStrip';
import PointsWidget from '@/components/portal/PointsWidget';
import { getMemberPoints } from '@/lib/member/points';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';

export const metadata: Metadata = buildPageMetadata({
  title: 'Your Dashboard',
  description: 'Your WorkforceAP member dashboard — training progress, next steps, career tools, and application status.',
  path: '/dashboard',
});

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  try {
    return await renderMemberDashboard(user);
  } catch (err) {
    console.error('[dashboard] unhandled render error', err);
    return (
      <div className="portal-error-fallback" style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>We couldn&rsquo;t load your dashboard</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Something went wrong while loading this page. This is usually temporary. Try again, or open another section from
          the menu.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <a href="/dashboard" className="btn btn-primary">
            Try again
          </a>
          <a href="https://www.workforceap.org/" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
            WorkforceAP home
          </a>
        </div>
      </div>
    );
  }
}

async function renderMemberDashboard(user: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  const { user: dbUser, careerBrief } = await loadMemberCareerBriefBundleSafe(user.id, { activeMemberOnly: true });
  if (!dbUser) redirect('/login');

  const intakePromise = prisma.user.findUnique({
    where: { id: user.id },
    select: {
      interviewEligible: true,
      interviewRequestedAt: true,
      interviewCompletedAt: true,
      preScreeningResponse: { select: { id: true } },
      onboardingCompletedAt: true,
      tourCompletedAt: true,
      fullName: true,
      phone: true,
      programInterest: true,
      careerRecommendationJson: true,
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
      courseEnrollment: { select: { enrolledByAdminId: true } },
    },
  });
  const profilePromise = prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      profilePhone: true,
      profileAddress: true,
      profileLinkedin: true,
      profileBio: true,
      employmentStatus: true,
      educationLevel: true,
    },
  });
  const engagementPromise = getMemberEngagementSignals(user.id);

  const [intakeResult, profileResult, engagementResult] = await Promise.allSettled([
    intakePromise,
    profilePromise,
    engagementPromise,
  ]);

  const intakeExtra = intakeResult.status === 'fulfilled' ? intakeResult.value : null;
  if (intakeResult.status === 'rejected') {
    console.error('[dashboard] intake query failed', intakeResult.reason);
  }

  const profileForCompleteness = profileResult.status === 'fulfilled' ? profileResult.value : null;
  if (profileResult.status === 'rejected') {
    console.error('[dashboard] profile completeness query failed', profileResult.reason);
  }

  const engagementSignals =
    engagementResult.status === 'fulfilled'
      ? engagementResult.value
      : {
          hasResume: false,
          jobApplicationCount: 0,
          counselorUnreadCount: 0,
          weeklyRecapUnopened: false,
        };
  if (engagementResult.status === 'rejected') {
    console.error('[dashboard] engagement signals failed', engagementResult.reason);
  }

  const careerMatchFromProfile = intakeExtra?.careerRecommendationJson as CareerMatchResult | null;

  const [toolsResult, applicationResult, dynamicActionsResult, jobApplicationsResult, pointsResult, recentTxResult, sessionEventsResult, interviewPracticeCompletionResult] = await Promise.allSettled([
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
    }),
    prisma.jobApplication.findMany({
      where: { userId: user.id, status: 'OFFER' },
    }),
    getMemberPoints(user.id),
    prisma.pointsTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, event: true, points: true, note: true, createdAt: true },
    }),
    // In-office session events — see lib/auth/actAsSubject.ts. Pulls every
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

  const recentTools = toolsResult.status === 'fulfilled' ? toolsResult.value : [];
  if (toolsResult.status === 'rejected') {
    console.error('[dashboard] recent AI tools query failed', toolsResult.reason);
  }

  const latestApplication = applicationResult.status === 'fulfilled' ? applicationResult.value : null;
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
        actorName: meta.actorName ?? 'your counselor',
        startedAt: ev.createdAt,
        toolCount: 1,
        resultIds: ev.entityId ? [ev.entityId] : [],
      });
    }
  }
  const latestSession =
    [...sessionMap.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null;

  const showMemberOnboarding = intakeExtra?.onboardingCompletedAt == null;
  const showMemberTour =
    intakeExtra?.onboardingCompletedAt != null && intakeExtra?.tourCompletedAt == null;
  const wizardProgramInterest =
    latestApplication?.programInterest ?? intakeExtra?.programInterest ?? '';

  const applicationStatusView = buildMemberApplicationStatusView(latestApplication, {
    enrolledProgram: dbUser.enrolledProgram ?? null,
    enrolledAt: dbUser.enrolledAt ?? null,
    assessmentCompleted: dbUser.assessmentCompleted ?? false,
  });

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
  const noApplicationOnFile = !latestApplication;

  const firstName = dbUser.fullName?.split(' ')[0] ?? 'there';
  const enrolledProgram = dbUser.enrolledProgram ?? null;
  const assessmentCompleted = dbUser.assessmentCompleted ?? false;
  const coursesCompleted = parseCourseSlugList(dbUser.coursesCompleted);
  
  const userAge = intakeExtra?.profile?.dob 
    ? Math.floor((Date.now() - new Date(intakeExtra.profile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const isMinor = intakeExtra?.profile?.isMinor || (userAge !== null && userAge < 18);

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const totalCourses = program?.courses.length ?? 0;
  const completedCount = program
    ? coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length
    : 0;
  const allCoursesComplete = totalCourses > 0 && completedCount >= totalCourses;

  const dashboardState: 'A' | 'B' | 'C' | 'D' = !enrolledProgram
    ? 'A'
    : !assessmentCompleted
      ? 'B'
      : allCoursesComplete
        ? 'D'
        : 'C';

  const completenessUser = {
    fullName: dbUser.fullName,
    email: dbUser.email,
    enrolledProgram: dbUser.enrolledProgram,
    assessmentCompleted: dbUser.assessmentCompleted,
  };
  const profileCompletenessPct = getProfileCompleteness(profileForCompleteness, completenessUser);
  const profileMissingFields = getProfileMissingFields(profileForCompleteness, completenessUser);
  const starterProfileReview = getCounselorStarterProfileReview({
    wasCounselorCreated: !!intakeExtra?.courseEnrollment?.enrolledByAdminId,
    phone: intakeExtra?.phone,
    profilePhone: intakeExtra?.profile?.profilePhone,
    profileAddress: intakeExtra?.profile?.profileAddress,
    city: intakeExtra?.profile?.city,
    state: intakeExtra?.profile?.state,
    zip: intakeExtra?.profile?.zip,
    referralSource: intakeExtra?.profile?.referralSource,
  });
  const starterProfileMissingLabels = getStarterProfileFieldLabels(starterProfileReview.missing);

  let nextBestActions = buildNextBestActions({
    state: dashboardState,
    noApplicationOnFile,
    enrolledProgram,
    assessmentCompleted,
    starterProfileReviewRequired: starterProfileReview.required,
    starterProfileMissingFields: starterProfileMissingLabels,
    hasResume: engagementSignals.hasResume,
    hasCompletedInterviewPractice,
    profileCompletenessPct,
    profileMissingFields,
    jobApplicationCount: engagementSignals.jobApplicationCount,
    counselorUnreadCount: engagementSignals.counselorUnreadCount,
    weeklyRecapUnopened: engagementSignals.weeklyRecapUnopened,
  });

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

  const checklist = {
    createAccount: true,
    chooseProgram: !!enrolledProgram,
    completeAssessment: assessmentCompleted,
    // Audit #8: previously checked "training unlocked" (program enrolled +
    // assessment done), so "Start training ✓" appeared while 0/16 courses
    // were complete. Now ties to actual course completion progress.
    startFirstCourse: completedCount >= 1,
    completeFirstCourse: completedCount >= 1,
  };
  const checklistAllDone = Object.values(checklist).every(Boolean);

  const recentActivity: Array<{ label: string; timestamp: Date }> = [];
  if (dbUser.enrolledAt) {
    recentActivity.push({ label: 'Enrolled in program', timestamp: dbUser.enrolledAt });
  }
  if (dbUser.assessmentCompletedAt) {
    recentActivity.push({ label: 'Completed skills assessment', timestamp: dbUser.assessmentCompletedAt });
  }
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastThree = recentActivity.slice(0, 3);

  const nextIncompleteCourse = program
    ? program.courses.find((c) => !coursesCompleted.includes(c.slug))
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

  /* Mobile progress percentage for orb */
  const mobilePct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
  const mobileProgressTone = allCoursesComplete ? 'Completed' : completedCount > 0 ? 'In progress' : 'Getting started';
  const mobileProgressSummary = totalCourses > 0
    ? `${completedCount} of ${totalCourses} course${totalCourses === 1 ? '' : 's'} complete`
    : 'Courses will appear once your program is set';
  const orbCircumference = 251.2;
  const orbDashoffset = orbCircumference - (orbCircumference * mobilePct) / 100;

  const AI_TOOL_LABELS: Record<string, string> = {
    job_match_scorer: 'Job Match Scorer',
    resume_analysis: 'Resume Analysis',
    resume_rewriter: 'Resume Rewriter',
    cover_letter: 'Cover Letter',
    interview_practice: 'Interview Practice',
    linkedin_headline: 'LinkedIn Headline',
    linkedin_about: 'LinkedIn About',
    salary_negotiation: 'Salary Negotiation',
    gap_analyzer: 'Gap Analyzer',
    interview_coach: 'AI Interview Coach',
    career_counselor: 'Career Counselor',
  };

  const interviewCompleted = !!intakeExtra?.interviewCompletedAt;
  const interviewRequested = !!intakeExtra?.interviewRequestedAt;
  const interviewEligibleFlag = intakeExtra?.interviewEligible ?? false;
  const preScreeningDone = !!intakeExtra?.preScreeningResponse;

  const mobileCarouselCardWidth = 'min(240px, calc(100vw - 3rem))';

  /* Journey timeline — complete / active (next) / locked (future) */
  const journeySteps = [
    {
      label: 'Program selected',
      done: !!enrolledProgram,
      active: !enrolledProgram,
      locked: false,
      detail: enrolledProgram ? 'Program on file' : noApplicationOnFile ? 'Start your application' : 'Choose a program',
    },
    {
      label: 'Skills assessment',
      done: assessmentCompleted,
      active: !!enrolledProgram && !assessmentCompleted,
      locked: !enrolledProgram,
      detail: assessmentCompleted ? 'Completed' : enrolledProgram ? 'Complete to start training' : 'Waiting for enrollment',
    },
    {
      label: 'Interview',
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
        ? 'Complete'
        : interviewRequested
          ? 'Scheduled — watch your email'
          : interviewEligibleFlag
            ? 'Request or attend your interview'
            : preScreeningDone
              ? 'Awaiting counselor review'
              : 'Submit pre-screening below',
    },
    {
      label: 'First course completed',
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
            ? 'All courses complete'
            : `${completedCount} course${completedCount === 1 ? '' : 's'} complete`
          : enrolledProgram && assessmentCompleted
            ? interviewEligibleFlag && !interviewCompleted
              ? 'Complete interview first'
              : 'Open your first course'
            : 'Complete prior steps first',
    },
  ];

  return (
    <>
      <h1 className="wa-sr-only">Welcome back, {firstName}</h1>

      {/* ── Recent in-office session card — shown to both mobile + desktop
          when a counselor or admin ran tools on the member's behalf in the
          last 30 days. See lib/auth/actAsSubject.ts. ── */}
      {latestSession ? (
        <MemberSessionCard
          actorName={latestSession.actorName}
          startedAt={latestSession.startedAt}
          toolCount={latestSession.toolCount}
        />
      ) : null}

      {/* ── Mobile-only dashboard (≤767px) ── */}
      <div className="md:wa-hidden portal-mobile-content">

        {/* ── Hero: greeting + progress ring ── */}
        <section style={{ padding: '1.25rem 1.25rem 1rem' }}>
          <div
            style={{
              borderRadius: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, white) 0%, white 52%)',
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
                <div style={{ display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', padding: '0.35rem 0.55rem', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--outline-variant)' }}>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                    {formatPortalDate(new Date())}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent-dark)' }}>
                    Member dashboard
                  </p>
                  <h2 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', margin: '0.2rem 0 0', lineHeight: 1.1 }}>
                    Welcome back, {firstName}
                  </h2>
                </div>
                {program && (
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', maxWidth: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.9rem', background: 'rgba(255,255,255,0.9)', border: '1px solid color-mix(in srgb, var(--color-accent) 10%, var(--outline-variant))' }}>
                    <p style={{ fontSize: '0.76rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.35, fontWeight: 600 }}>
                      {program.title}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress ring — hidden for pre-enrollment (state A) since 0% is misleading */}
              {dashboardState !== 'A' && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', flexShrink: 0, minWidth: '7rem' }}>
                <div
                  className="portal-progress-ring"
                  style={{
                    width: '6rem',
                    height: '6rem',
                    flexShrink: 0,
                    borderRadius: '999px',
                    background: 'radial-gradient(circle at center, color-mix(in srgb, var(--color-accent) 10%, white) 0%, white 60%)',
                    boxShadow: '0 14px 32px color-mix(in srgb, var(--color-accent) 14%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 12%, white)',
                  }}
                >
                  <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 96 96" aria-hidden>
                    <circle cx="48" cy="48" r="40" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="7" />
                    <circle
                      cx="48" cy="48" r="40" fill="transparent"
                      stroke="var(--color-accent)" strokeWidth="7"
                      strokeDasharray={orbCircumference}
                      strokeDashoffset={orbDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.12rem' }}>
                    <span className="wa-text-xl wa-font-extrabold wa-text-[var(--color-accent-dark)]" style={{ lineHeight: 1 }}>{mobilePct}%</span>
                    <span className="wa-text-[9px] wa-font-semibold wa-uppercase wa-tracking-[0.12em] wa-text-[var(--color-on-surface-variant)]" style={{ lineHeight: 1 }}>
                      {mobileProgressTone}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    padding: '0.38rem 0.72rem',
                    borderRadius: '999px',
                    background: 'color-mix(in srgb, var(--color-accent) 10%, white)',
                    border: '1px solid color-mix(in srgb, var(--color-accent) 20%, white)',
                  }}
                >
                  <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.14em] wa-text-[var(--color-accent-dark)]">
                    Training progress
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.68rem', lineHeight: 1.35, color: 'var(--color-on-surface-variant)', textAlign: 'center', maxWidth: '7rem' }}>
                  {mobileProgressSummary}
                </p>
              </div>}
            </div>

            {dashboardState !== 'A' && (
            <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 78%, white)' }}>
              <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]" style={{ margin: 0, lineHeight: 1.5 }}>
                Training progress is based on completed courses. Your application steps are shown below.
              </p>
            </div>
            )}
          </div>
        </section>

        {/* ── State A: unmissable next-step CTA — shown before voice section when member hasn't enrolled ── */}
        {dashboardState === 'A' && (
          <section style={{ padding: '0 1.25rem 1.25rem' }}>
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
                Your next step
              </p>
              <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                {noApplicationOnFile
                  ? 'Apply now — 10 minutes'
                  : 'Choose your program'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                {noApplicationOnFile
                  ? 'Career training at no cost to members, funded by grants and partnerships. A counselor will help you pick the right program and next steps.'
                  : 'Pick the career track that fits your goals. Programs are available at no cost to members, funded by grants and partnerships.'}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fff', color: 'var(--color-accent)', padding: '0.75rem 1.25rem', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <span>{noApplicationOnFile ? 'Start Application' : 'Choose Program'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
              </div>
            </Link>
          </section>
        )}

        <section style={{ padding: '0 1.5rem 1.25rem' }}>
          <MemberDashboardVoiceSectionLazy />
        </section>

        {dashboardState !== 'A' && nextBestActions.length > 0 && (
          <section style={{ padding: '0 1.25rem 1rem' }}>
            <MemberNextStepsStrip actions={nextBestActions} compact fillRow />
          </section>
        )}

        {/* ── Priority next-step card ── */}
        <PlacementConfirmationStrip offers={jobOffers} />
        {applicationStatus?.nextStep && (
          <section style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
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
                  style={{ display: 'block', width: '100%', background: '#fff', color: 'var(--color-accent)', padding: '0.75rem', borderRadius: '0.625rem', textDecoration: 'none', textAlign: 'center', fontWeight: 700, fontSize: '0.875rem', boxSizing: 'border-box' }}
                >
                  Take action
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Career path ── */}
        <div style={{ padding: '0 1.25rem', marginBottom: '0.75rem' }}>
          <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
          <LogCertificationModal />
        </div>

        {/* ── Application journey timeline ── */}
        <section style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-dash-section-header__title">Application Journey</h3>
          </div>
          <div className="portal-journey-timeline">
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
        </section>

        {/* ── Points widget ── */}
        {memberPoints && memberPoints.total > 0 && (
          <section style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
            <PointsWidget
              total={memberPoints.total}
              level={memberPoints.level}
              recent={recentTx}
            />
          </section>
        )}

        {/* Recommended programs (only when not enrolled) OR “keep going” actions (when enrolled) */}
        {!enrolledProgram ? (
          <section style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
              <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Recommended Programs</h3>
              <a href="/programs" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration:"none" }}>View All</a>
            </div>
            <div style={{ display:"flex", gap:"1rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
              {PROGRAMS.slice(0, 3).map((prog, i) => (
                <div
                  key={i}
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
                    <p className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-widest" style={{ color: 'var(--color-gold)' }}>{prog.partner || 'WorkforceAP'}</p>
                    <h4 className="wa-font-bold wa-text-sm wa-text-[var(--color-on-surface)] wa-leading-tight">{prog.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
              <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">
                Next milestones
              </h3>
              <a href="/dashboard/training" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration:"none" }}>
                Training
              </a>
            </div>
            <div style={{ display:"flex", gap:"0.75rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
              {[
                {
                  eyebrow: program?.title ?? 'Your program',
                  title: nextIncompleteCourse?.name ? `Continue: ${nextIncompleteCourse.name}` : 'Continue your training',
                  desc: nextIncompleteCourse?.name ? 'Pick up where you left off.' : 'Open your training track and keep progressing.',
                  href: '/dashboard/training',
                  icon: 'school',
                },
                {
                  eyebrow: 'Job search tools',
                  title: 'Practice interview answers',
                  desc: 'Build confidence for recruiter screens and counselor interviews.',
                  href: '/dashboard/ai-tools/interview-practice',
                  icon: 'record_voice_over',
                },
                {
                  eyebrow: 'Connect',
                  title: 'Browse job board',
                  desc: 'Explore roles that fit your program and interests.',
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

        {/* ── Quick Actions 2x2 ── */}
        <section style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-dash-section-header__title">Quick Actions</h3>
          </div>
          <div className="portal-quick-grid-2x2">
            {([
              { icon: 'upload_file', label: 'Upload Resume', href: '/dashboard/ai-tools/resume-rewriter' },
              { icon: 'support_agent', label: 'My Progress', href: '/dashboard/readiness' },
              { icon: 'forum', label: 'Interview Prep', href: '/dashboard/ai-tools/interview-practice' },
              { icon: 'auto_awesome', label: 'AI Tools', href: '/dashboard/ai-tools' },
            ] as const).map((action) => (
              <a key={action.label} href={action.href} className="portal-quick-grid-item">
                <div className="portal-quick-grid-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                </div>
                <span className="portal-quick-grid-item__label">{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Recent AI Activity — mobile ── */}
        {recentTools.length > 0 && (
          <section style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }} aria-label="Recent AI activity">
            <div className="portal-dash-section-header">
              <h3 className="portal-dash-section-header__title">Recent AI Activity</h3>
              <Link href="/dashboard/ai-tools/history" className="portal-dash-section-header__action">View all</Link>
            </div>
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
          </section>
        )}
      </div>

      {/* ── Desktop view (hidden on mobile) ── */}
      <div className="wa-hidden md:wa-block">
        <PortalEntryErrorBoundary>
          <Suspense fallback={<PortalLoadingState message="Loading portal..." />}>
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
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem 1.5rem' }}>
                <MemberDashboardVoiceSectionLazy />
              </div>
              <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
                <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
                  <div style={{ maxWidth: '300px' }}>
                    <LogCertificationModal />
                  </div>
                  {memberPoints && memberPoints.total > 0 && (
                    <div style={{ flex: '1 1 280px', maxWidth: '340px' }}>
                      <PointsWidget total={memberPoints.total} level={memberPoints.level} recent={recentTx} />
                    </div>
                  )}
                </div>
              </div>
              <Suspense fallback={<PortalLoadingState message="Loading dashboard..." />}>
                <DashboardHomeClient
                  recommendedActions={recommendedActions}
                  jobSearchUrl={jobSearchUrl}
                  aiToolsUsedCount={recentTools.length}
                  firstName={firstName}
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
                />
              </Suspense>
              <PlacementConfirmationStrip offers={jobOffers} />
              {showMatchedRoles && userAge !== null && userAge < 14 ? null : (
                <Suspense fallback={<PortalLoadingState message="Loading career matches..." />}>
                  <MatchedRoles />
                </Suspense>
              )}
              {/* Recent AI Activity is rendered in the mobile view above —
                  suppressed here so the same data doesn't appear twice in the DOM
                  on wider viewports. DashboardHomeClient surfaces activity inline. */}
            </PortalEntryClient>
          </Suspense>
        </PortalEntryErrorBoundary>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileBottomNav variant="portal" />
    </>
  );
}
