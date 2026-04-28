import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PROGRAMS } from '@/lib/content/programs';
import { loadMemberCareerBriefBundleSafe } from '@/lib/content/careerBriefPersonalization';
import { prisma } from '@/lib/db/prisma';
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
import { stripMarkdownForPreview } from '@/lib/text/stripMarkdown';
import PortalLoadingState from '@/components/portal/PortalLoadingState';
import LogCertificationModal from './LogCertificationModal';
import PlacementConfirmationStrip from './PlacementConfirmationStrip';
import { getMemberStateSummary } from '@/lib/member/memberStateSummary';

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
  if (!dbUser) redirect('/login?redirectTo=/dashboard');

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
          referralSource: true,
          dob: true,
          isMinor: true,
        },
      },
    },
  });

  const engagementPromise = getMemberEngagementSignals(user.id);

  const [intakeResult, engagementResult] = await Promise.allSettled([
    intakePromise,
    engagementPromise,
  ]);

  const intakeExtra = intakeResult.status === 'fulfilled' ? intakeResult.value : null;
  const engagementSignals =
    engagementResult.status === 'fulfilled'
      ? engagementResult.value
      : {
          hasResume: false,
          jobApplicationCount: 0,
          counselorUnreadCount: 0,
          weeklyRecapUnopened: false,
        };

  const [toolsResult, applicationResult, dynamicActionsResult, jobApplicationsResult, sessionEventsResult] = await Promise.allSettled([
    prisma.aIToolResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, toolType: true, inputSummary: true, createdAt: true },
    }),
    prisma.application.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.memberNextBestAction.findMany({
      where: { memberId: user.id, status: 'PENDING' },
      orderBy: { priority: 'desc' },
      take: 2,
    }),
    prisma.jobApplication.findMany({
      where: { userId: user.id, status: 'OFFER' },
    }),
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
  ]);

  const recentTools = toolsResult.status === 'fulfilled' ? toolsResult.value : [];
  const latestApplication = applicationResult.status === 'fulfilled' ? applicationResult.value : null;
  const dynamicNextActions = dynamicActionsResult.status === 'fulfilled' ? dynamicActionsResult.value : [];
  const jobOffers = jobApplicationsResult.status === 'fulfilled' ? jobApplicationsResult.value : [];
  const sessionEvents = sessionEventsResult.status === 'fulfilled' ? sessionEventsResult.value : [];

  // Unified state summary
  const state = getMemberStateSummary({ ...dbUser, profile: dbUser.profile ?? null } as any, latestApplication);

  // Group on-behalf-of session events
  const sessionMap = new Map<string, any>();
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
  const latestSession = [...sessionMap.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null;

  const showMemberOnboarding = intakeExtra?.onboardingCompletedAt == null;
  const showMemberTour = intakeExtra?.onboardingCompletedAt != null && intakeExtra?.tourCompletedAt == null;
  const wizardProgramInterest = latestApplication?.programInterest ?? intakeExtra?.programInterest ?? '';

  let nextBestActions = buildNextBestActions({
    state: state.dashboardState,
    noApplicationOnFile: !latestApplication,
    enrolledProgram: dbUser.enrolledProgram,
    assessmentCompleted: dbUser.assessmentCompleted,
    hasResume: engagementSignals.hasResume,
    profileCompletenessPct: state.profilePct,
    profileMissingFields: state.profileMissingFields,
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

  const careerMatchFromProfile = intakeExtra?.careerRecommendationJson as CareerMatchResult | null;
  const program = state.enrolledProgram;
  const nextIncompleteCourse = program ? program.courses.find((c) => !parseCourseSlugList(dbUser.coursesCompleted).includes(c.slug)) : null;

  let superAdmin = false;
  try {
    superAdmin = await isSuperAdmin(user.id);
  } catch (e) {}

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

  const orbCircumference = 251.2;
  const orbDashoffset = orbCircumference - (orbCircumference * state.trainingProgressPct) / 100;
  const mobileProgressTone = state.allCoursesComplete ? 'Completed' : state.coursesCompletedCount > 0 ? 'In progress' : 'Getting started';

  const journeySteps = [
    { label: 'Profile verified', done: state.checklist.chooseProgram, active: !state.checklist.chooseProgram, detail: state.checklist.chooseProgram ? 'Program on file' : 'Choose a program' },
    { label: 'Skills assessment', done: state.checklist.completeAssessment, active: state.checklist.chooseProgram && !state.checklist.completeAssessment, detail: state.checklist.completeAssessment ? 'Completed' : state.checklist.chooseProgram ? 'Complete to start training' : 'Waiting for enrollment' },
    { label: 'Interview', done: !!intakeExtra?.interviewCompletedAt, active: state.checklist.completeAssessment && !intakeExtra?.interviewCompletedAt && (intakeExtra?.interviewRequestedAt || intakeExtra?.interviewEligible), detail: intakeExtra?.interviewCompletedAt ? 'Complete' : intakeExtra?.interviewRequestedAt ? 'Scheduled' : intakeExtra?.interviewEligible ? 'Request interview' : 'Awaiting review' },
    { label: 'Enrollment confirmed', done: state.coursesCompletedCount > 0, active: state.checklist.completeAssessment && state.coursesCompletedCount === 0 && (!intakeExtra?.interviewEligible || !!intakeExtra?.interviewCompletedAt), detail: state.coursesCompletedCount > 0 ? 'Training in progress' : 'Start your first course' },
  ];

  const mobileCarouselCardWidth = 'min(240px, calc(100vw - 3rem))';

  return (
    <>
      <h1 className="wa-sr-only">Welcome back, {state.firstName}</h1>

      {latestSession && (
        <div className="wa-px-4 md:wa-px-8 wa-mb-6">
          <MemberSessionCard actorName={latestSession.actorName} startedAt={latestSession.startedAt} toolCount={latestSession.toolCount} />
        </div>
      )}

      {/* ── Responsive Shell ── */}
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
              initialCity: intakeExtra?.profile?.city ?? '',
              initialState: intakeExtra?.profile?.state ?? '',
              initialZip: intakeExtra?.profile?.zip ?? '',
              initialProgramInterest: wizardProgramInterest,
              initialReferralSource: intakeExtra?.profile?.referralSource ?? '',
            }}
          >
            {/* ── Layout Wrapper ── */}
            <div className="wa-max-w-[1200px] wa-mx-auto wa-px-4 md:wa-px-8">
              
              {/* ── Hero / Intro (Responsive Split) ── */}
              <div className="wa-grid wa-gap-6 md:wa-grid-cols-[1fr_320px] wa-mb-8">
                
                {/* Greeting & Voice section */}
                <div className="wa-flex wa-flex-col wa-gap-6">
                  <div className="md:wa-hidden">
                    {/* Mobile Greeting Card */}
                    <div className="wa-bg-gradient-to-b wa-from-[color-mix(in_srgb,var(--color-accent)_7%,white)] wa-to-white wa-p-6 wa-rounded-[1.5rem] wa-border wa-border-[color-mix(in_srgb,var(--color-accent)_14%,var(--outline-variant))] wa-shadow-lg">
                      <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-accent-dark)] wa-mb-1">Member dashboard</p>
                      <h2 className="wa-text-2xl wa-font-extrabold wa-tracking-tight">Welcome back, {state.firstName}</h2>
                      {program && <p className="wa-text-sm wa-font-semibold wa-text-[var(--color-on-surface-variant)] wa-mt-1">{program.title}</p>}
                    </div>
                  </div>
                  <div className="wa-hidden md:wa-block wa-pt-4">
                    <h2 className="wa-text-3xl wa-font-extrabold wa-tracking-tight wa-mb-2">Welcome back, {state.firstName}</h2>
                    <p className="wa-text-[var(--color-on-surface-variant)]">Your WorkforceAP member dashboard — training progress, next steps, and career tools.</p>
                  </div>
                  <MemberDashboardVoiceSectionLazy />
                </div>

                {/* Training Progress (Desktop Sidebar / Mobile Hero Integration) */}
                <div className="wa-flex wa-flex-col wa-gap-4">
                  {state.dashboardState !== 'A' && (
                    <div className="wa-bg-white wa-p-6 wa-rounded-[1.5rem] wa-border wa-border-[var(--outline-variant)] wa-shadow-sm wa-flex wa-flex-col wa-items-center wa-text-center">
                      <div className="wa-relative wa-w-24 wa-h-24 wa-mb-4">
                        <svg className="wa-w-full wa-h-full wa-rotate-[-90deg]" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="40" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="7" />
                          <circle cx="48" cy="48" r="40" fill="transparent" stroke="var(--color-accent)" strokeWidth="7" strokeDasharray={orbCircumference} strokeDashoffset={orbDashoffset} strokeLinecap="round" />
                        </svg>
                        <div className="wa-absolute wa-inset-0 wa-flex wa-flex-col wa-items-center wa-justify-center">
                          <span className="wa-text-xl wa-font-extrabold">{state.trainingProgressPct}%</span>
                        </div>
                      </div>
                      <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-accent-dark)] wa-mb-1">Training Progress</p>
                      <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{state.coursesCompletedCount} of {state.totalCoursesCount} courses</p>
                      <Link href="/dashboard/training" className="btn btn-ghost wa-text-xs wa-mt-3">View training track</Link>
                    </div>
                  )}
                  {state.dashboardState === 'A' && (
                    <Link href={!latestApplication ? '/apply' : '/dashboard/program'} className="wa-block wa-bg-gradient-to-br wa-from-[var(--color-accent-dark)] wa-to-[var(--color-accent)] wa-p-6 wa-rounded-[1.5rem] wa-text-white wa-no-underline wa-shadow-md">
                      <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-opacity-80 wa-mb-1">Next Step</p>
                      <h3 className="wa-text-lg wa-font-bold wa-mb-2">{!latestApplication ? 'Start Application' : 'Choose Program'}</h3>
                      <p className="wa-text-xs wa-opacity-90 wa-leading-relaxed wa-mb-4">Complete your setup to unlock training and job support.</p>
                      <div className="wa-bg-white wa-text-[var(--color-accent)] wa-px-4 wa-py-2 wa-rounded-lg wa-font-bold wa-text-sm wa-inline-flex wa-items-center wa-gap-2">
                        Get Started <span className="material-symbols-outlined wa-text-sm">arrow_forward</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>

              {/* ── Priority Actions ── */}
              <PlacementConfirmationStrip offers={jobOffers} />
              {state.applicationStatus?.nextStep && (
                <div className="wa-mb-8">
                  <div className="wa-bg-gradient-to-r wa-from-[var(--color-accent-dark)] wa-to-[var(--color-accent)] wa-p-6 wa-rounded-[1.5rem] wa-text-white wa-flex wa-flex-col md:wa-flex-row md:wa-items-center wa-gap-4">
                    <div className="wa-flex-1">
                      <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-opacity-80 wa-mb-1">Priority Action</p>
                      <h3 className="wa-text-xl wa-font-bold">{state.applicationStatus.nextStep}</h3>
                    </div>
                    <Link href={state.applicationStatus.nextStepHref} className="wa-bg-white wa-text-[var(--color-accent)] wa-px-6 wa-py-3 wa-rounded-xl wa-font-bold wa-text-center wa-no-underline">Take Action</Link>
                  </div>
                </div>
              )}

              {/* ── Next Steps Strip ── */}
              {nextBestActions.length > 0 && (
                <div className="wa-mb-8">
                  <MemberNextStepsStrip actions={nextBestActions} compact fillRow />
                </div>
              )}

              {/* ── Core Content Grid ── */}
              <div className="wa-grid wa-gap-8 md:wa-grid-cols-[1fr_320px]">
                
                {/* Main Column */}
                <div className="wa-flex wa-flex-col wa-gap-8">
                  
                  {/* Career Path Section */}
                  <section>
                    <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={state.coursesCompletedCount} />
                    <LogCertificationModal />
                  </section>

                  {/* Desktop Only: Matched Roles */}
                  <div className="wa-hidden md:wa-block">
                    {state.dashboardState !== 'A' && (
                      <Suspense fallback={<PortalLoadingState message="Loading career matches..." />}>
                        <MatchedRoles />
                      </Suspense>
                    )}
                  </div>

                  {/* Recent Activity / AI History (Responsive) */}
                  <div className="wa-grid wa-gap-8 md:wa-grid-cols-2">
                    {/* Activity Timeline */}
                    <section>
                      <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-4">Application Journey</h3>
                      <div className="wa-flex wa-flex-col wa-gap-4">
                        {journeySteps.map((step, i) => (
                          <div key={i} className={`wa-flex wa-gap-4 ${step.active ? 'wa-opacity-100' : 'wa-opacity-50'}`}>
                            <div className={`wa-w-6 wa-h-6 wa-rounded-full wa-flex wa-items-center wa-justify-center wa-flex-shrink-0 ${step.done ? 'wa-bg-green-500 wa-text-white' : step.active ? 'wa-bg-[var(--color-accent)] wa-text-white' : 'wa-bg-[var(--outline-variant)]'}`}>
                              {step.done ? <span className="material-symbols-outlined wa-text-xs">check</span> : <span className="wa-text-[10px]">{i+1}</span>}
                            </div>
                            <div>
                              <p className="wa-text-sm wa-font-bold">{step.label}</p>
                              <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Recent AI Tools */}
                    {recentTools.length > 0 && (
                      <section>
                        <div className="wa-flex wa-items-center wa-justify-between wa-mb-4">
                          <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)]">Recent AI Activity</h3>
                          <Link href="/dashboard/ai-tools/history" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent)]">View all</Link>
                        </div>
                        <div className="wa-flex wa-flex-col wa-gap-3">
                          {recentTools.map((r) => (
                            <div key={r.id} className="wa-p-3 wa-bg-white wa-rounded-xl wa-border wa-border-[var(--outline-variant)] wa-flex wa-items-center wa-gap-3">
                              <span className="material-symbols-outlined wa-text-[var(--color-accent)]">smart_toy</span>
                              <div className="wa-flex-1 wa-min-w-0">
                                <p className="wa-text-sm wa-font-bold wa-truncate">{AI_TOOL_LABELS[r.toolType] ?? r.toolType}</p>
                                <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{formatPortalDate(r.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>

                {/* Sidebar Column */}
                <div className="wa-flex wa-flex-col wa-gap-8">
                  {/* Quick Actions */}
                  <section>
                    <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-4">Quick Actions</h3>
                    <div className="wa-grid wa-grid-cols-2 wa-gap-2">
                      {[
                        { icon: 'upload_file', label: 'Resume', href: '/dashboard/ai-tools/resume-rewriter' },
                        { icon: 'support_agent', label: 'Progress', href: '/dashboard/readiness' },
                        { icon: 'forum', label: 'Interviews', href: '/dashboard/ai-tools/interview-practice' },
                        { icon: 'auto_awesome', label: 'AI Tools', href: '/dashboard/ai-tools' },
                      ].map((action) => (
                        <Link key={action.label} href={action.href} className="wa-p-4 wa-bg-white wa-rounded-xl wa-border wa-border-[var(--outline-variant)] wa-flex wa-flex-col wa-items-center wa-text-center wa-gap-2 wa-no-underline hover:wa-bg-[var(--surface-container-lowest)] wa-transition-colors">
                          <span className="material-symbols-outlined wa-text-[var(--color-accent)]">{action.icon}</span>
                          <span className="wa-text-[10px] wa-font-bold wa-uppercase">{action.label}</span>
                        </Link>
                      ))}
                    </div>
                  </section>

                  {/* Milestones / Next Up */}
                  {state.dashboardState !== 'A' && (
                    <section>
                      <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-4">Next Milestones</h3>
                      <div className="wa-flex wa-flex-col wa-gap-3">
                        <Link href="/dashboard/training" className="wa-p-4 wa-bg-white wa-rounded-xl wa-border wa-border-[var(--outline-variant)] wa-flex wa-gap-3 wa-no-underline">
                          <span className="material-symbols-outlined wa-text-[var(--color-accent)]">school</span>
                          <div>
                            <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)]">Training</p>
                            <p className="wa-text-sm wa-font-bold">{nextIncompleteCourse?.name ?? 'Continue Training'}</p>
                          </div>
                        </Link>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </PortalEntryClient>
        </Suspense>
      </PortalEntryErrorBoundary>

      <MobileBottomNav variant="portal" />
    </>
  );
}
