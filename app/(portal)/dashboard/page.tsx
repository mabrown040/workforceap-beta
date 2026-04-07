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
import PortalEntryErrorBoundary from '@/components/portal/PortalEntryErrorBoundary';
import DashboardPageErrorBoundary from '@/components/portal/DashboardPageErrorBoundary';
import { getMemberEngagementSignals } from '@/lib/member/memberEngagementSignals';
import { buildNextBestActions } from '@/lib/member/nextBestActions';
import { getProfileCompleteness } from '@/lib/resume/profileCompleteness';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { stripMarkdownForPreview } from '@/lib/text/stripMarkdown';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member overview',
  description: 'Your WorkforceAP member portal overview.',
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
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>We couldn&apos;t load your dashboard</h1>
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
          referralSource: true,
          dob: true,
          isMinor: true,
        },
      },
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

  const [toolsResult, applicationResult] = await Promise.allSettled([
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
  ]);

  const recentTools = toolsResult.status === 'fulfilled' ? toolsResult.value : [];
  if (toolsResult.status === 'rejected') {
    console.error('[dashboard] recent AI tools query failed', toolsResult.reason);
  }

  const latestApplication = applicationResult.status === 'fulfilled' ? applicationResult.value : null;
  if (applicationResult.status === 'rejected') {
    console.error('[dashboard] latest application query failed', applicationResult.reason);
  }

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

  const profileCompletenessPct = getProfileCompleteness(profileForCompleteness, {
    fullName: dbUser.fullName,
    email: dbUser.email,
  });

  const nextBestActions = buildNextBestActions({
    state: dashboardState,
    noApplicationOnFile,
    enrolledProgram,
    assessmentCompleted,
    hasResume: engagementSignals.hasResume,
    profileCompletenessPct,
    jobApplicationCount: engagementSignals.jobApplicationCount,
    counselorUnreadCount: engagementSignals.counselorUnreadCount,
    weeklyRecapUnopened: engagementSignals.weeklyRecapUnopened,
  });

  const checklist = {
    createAccount: true,
    chooseProgram: !!enrolledProgram,
    completeAssessment: assessmentCompleted,
    startFirstCourse: completedCount > 0,
    completeFirstCourse: completedCount >= 1, // true after completing any single course
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

  /* Journey timeline — complete / active (next) / locked (future) */
  const journeySteps = [
    {
      label: 'Profile verified',
      done: !!enrolledProgram,
      active: !enrolledProgram,
      locked: false,
      detail: enrolledProgram ? 'Program on file' : 'Choose a program',
    },
    {
      label: 'Skills assessment',
      done: assessmentCompleted,
      active: !!enrolledProgram && !assessmentCompleted,
      locked: !enrolledProgram,
      detail: assessmentCompleted ? 'Completed' : enrolledProgram ? 'Complete to unlock training' : 'Locked until enrolled',
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
            : 'Awaiting counselor',
    },
    {
      label: 'Enrollment confirmed',
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
          ? 'Training in progress'
          : enrolledProgram && assessmentCompleted
            ? interviewEligibleFlag && !interviewCompleted
              ? 'Complete interview first'
              : 'Start your first course'
            : 'Complete prior steps first',
    },
  ];

  return (
    <DashboardPageErrorBoundary>
    <>
      <h1 className="wa-sr-only">Welcome back, {firstName}</h1>
      {/* ── Mobile-only hero + dashboard (≤640px) ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Welcome greeting + progress orb */}
        <section style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"1.5rem 1.5rem 1rem" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem", maxWidth:"60%" }}>
            <p className="wa-text-[var(--color-on-surface-variant)] wa-text-xs wa-font-medium wa-tracking-[0.08em] wa-uppercase">
              Week of {formatPortalDate(new Date())}
            </p>
            <h2 className="wa-text-2xl wa-font-extrabold wa-tracking-tight wa-text-[var(--color-on-surface)]">
              Welcome back, {firstName}
            </h2>
          </div>
          {/* Progress orb */}
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", width:"5rem", height:"5rem", flexShrink:0 }}>
            <svg style={{ width:"100%", height:"100%", transform:"rotate(-90deg)" }} viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="6" />
              <circle
                cx="48" cy="48" r="40" fill="transparent"
                stroke="var(--color-accent)" strokeWidth="6"
                strokeDasharray={orbCircumference}
                strokeDashoffset={orbDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span className="wa-text-base wa-font-bold wa-text-[var(--color-accent-dark)]">{mobilePct}%</span>
              <span className="wa-text-[8px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-gold)]">Progress</span>
            </div>
          </div>
        </section>

        <section style={{ padding: '0 1.5rem 1.25rem' }}>
          <MemberDashboardVoiceSectionLazy />
        </section>

        {nextBestActions.length > 0 && (
          <section style={{ padding: '0 1.5rem 1rem' }}>
            <MemberNextStepsStrip actions={nextBestActions} compact fillRow />
          </section>
        )}

        {/* Next step card */}
        {applicationStatus?.nextStep && (
          <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem" }}>
            <div style={{ borderRadius:"0.75rem", overflow:"hidden", boxShadow:"0 4px 20px rgba(173,44,77,0.25)" }}>
              <div style={{ background:"var(--color-accent)", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem" }}>
                    <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.12em]" style={{ color:"rgba(255,255,255,0.92)" }}>
                      Priority
                    </span>
                    <h2 className="wa-text-lg wa-font-bold wa-tracking-tight" style={{ color:"#fff", margin:0 }}>
                      {applicationStatus.nextStep}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined wa-text-xl" style={{ color:"#ffbb00", fontVariationSettings: "'FILL' 1" }} aria-hidden>bolt</span>
                </div>
                <p className="wa-text-sm wa-leading-relaxed" style={{ color:"rgba(255,255,255,0.9)", margin:0 }}>
                  Your next action for{' '}
                  {applicationStatus.programInterest ?? program?.title ?? 'your program'}.
                </p>
                <Link href={applicationStatus.nextStepHref} className="wa-font-bold wa-text-sm wa-tracking-wide active:scale-[0.98] wa-transition-transform" style={{ display:"block", width:"100%", background:"#fff", color:"var(--color-accent)", padding:"0.75rem", borderRadius:"0.5rem", textDecoration:"none", textAlign:"center", cursor:"pointer", boxSizing:"border-box" }}>
                  Take action
                </Link>
              </div>
            </div>
          </section>
        )}

        <div style={{ padding: '0 1.5rem' }}>
          <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
        </div>

        {/* Application journey timeline */}
        <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
          <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Application Journey</h3>
          <div style={{ position:"relative", marginLeft:"1rem" }}>
            <div style={{ position:"absolute", left:"11px", top:"0.5rem", bottom:"0.5rem", width:"2px", background:"var(--surface-container-high)" }} />
            {journeySteps.map((step, i) => {
              const locked = 'locked' in step && step.locked;
              return (
              <div key={i} style={{ position:"relative", display:"flex", alignItems:"flex-start", gap:"1.25rem", paddingBottom:"1.75rem", opacity: locked ? 0.45 : 1 }}>
                {step.done ? (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"var(--color-accent)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span className="material-symbols-outlined" style={{ color:"var(--color-white)", fontSize:"0.75rem" }}>check</span>
                  </div>
                ) : step.active ? (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"var(--surface-container-lowest)", border:"3px solid var(--color-accent)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }} title="Current step">
                    <div style={{ width:"0.45rem", height:"0.45rem", borderRadius:"9999px", background:"var(--color-accent)" }} />
                  </div>
                ) : (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"var(--surface-container-high)", border:"2px solid var(--outline-variant)", flexShrink:0 }} title={locked ? 'Locked — complete prior steps' : 'Upcoming'} />
                )}
                <div>
                  <p className={`wa-font-bold wa-text-sm wa-leading-none wa-mb-1 ${step.active && !step.done ? 'wa-text-[var(--color-accent-dark)]' : 'wa-text-[var(--color-on-surface)]'}`}>
                    {step.label}
                  </p>
                  {step.detail && <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{step.detail}</p>}
                </div>
              </div>
            );})}
          </div>
        </section>

        {/* Recommended programs — horizontal scroll cards */}
        <section style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
            <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Recommended Programs</h3>
            <a href="/programs" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent-dark)]" style={{ textDecoration:"none" }}>View All</a>
          </div>
          <div style={{ display:"flex", gap:"1rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
            {PROGRAMS.slice(0, 3).map((prog, i) => (
              <div key={i} style={{ minWidth:"220px", borderRadius:"0.75rem", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 1px 3px rgba(0,0,0,0.08)", flexShrink:0, background:"var(--surface-container)" }}>
                <div style={{ height:"7rem", position:"relative", background: `linear-gradient(135deg, ${prog.categoryColor} 0%, var(--surface-container-highest) 100%)` }}>
                </div>
                <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.25rem" }}>
                  <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest" style={{ color: 'var(--color-gold)' }}>{prog.partner || 'WorkforceAP'}</p>
                  <h4 className="wa-font-bold wa-text-sm wa-text-[var(--color-on-surface)] wa-leading-tight">{prog.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions 2x2 grid */}
        <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[var(--color-on-surface-variant)]">Quick Actions</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
            {[
              { icon: 'upload_file', label: 'Upload Resume', href: '/dashboard/ai-tools/resume-rewriter' },
              { icon: 'event_available', label: 'Book Coaching', href: '/dashboard/messages' },
              { icon: 'forum', label: 'Practice Interview', href: '/dashboard/ai-tools/interview-practice' },
              { icon: 'psychology', label: 'AI Resume Help', href: '/dashboard/ai-tools' },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className="active:scale-[0.97] wa-transition-transform" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"1rem", borderRadius:"0.75rem", textDecoration:"none", background:"var(--surface-container-lowest)", border:"1px solid var(--outline-variant)", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <span className="material-symbols-outlined" style={{ marginBottom:"0.5rem", color:"var(--color-accent)" }}>{action.icon}</span>
                <span className="wa-text-[11px] wa-font-bold wa-text-[var(--color-on-surface)] wa-tracking-tight">{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Recent AI Activity */}
        {recentTools.length > 0 && (
          <section style={{ padding:'0 1.5rem', marginBottom:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144]">Recent AI Activity</h3>
              <Link href="/dashboard/ai-tools/history" className="wa-text-xs wa-font-bold wa-text-[#8c0f37]" style={{ textDecoration:'none' }}>View all →</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {recentTools.map((r) => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem', borderRadius:'0.75rem', background:'#ffffff', border:'1px solid rgba(222,191,194,0.3)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'1.1rem', color:'var(--color-accent)', flexShrink:0 }}>smart_toy</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="wa-text-xs wa-font-bold wa-text-[#1c1b1b] wa-leading-tight">{AI_TOOL_LABELS[r.toolType] ?? r.toolType}</p>
                    {r.inputSummary && (
                      <p className="wa-text-[11px] wa-text-[#584144] wa-leading-snug wa-truncate" style={{ marginTop: '0.1rem' }}>
                        {stripMarkdownForPreview(r.inputSummary)}
                      </p>
                    )}
                  </div>
                  <span className="wa-text-[10px] wa-text-[#584144] wa-whitespace-nowrap" style={{ flexShrink:0 }}>{formatPortalDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Desktop view (hidden on mobile) ── */}
      <div className="wa-hidden wa-md:wa-block">
        <PortalEntryErrorBoundary>
        <PortalEntryClient
          portal="member"
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
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 1.5rem' }}>
            <MemberDashboardVoiceSectionLazy />
          </div>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem' }}>
            <MemberCareerPathSection careerMatch={careerMatchFromProfile} coursesCompletedCount={completedCount} />
          </div>
          <DashboardHomeClient
            recommendedActions={recommendedActions}
            jobSearchUrl={jobSearchUrl}
            firstName={firstName}
            nextBestActions={nextBestActions}
            assessmentDone={assessmentCompleted}
            preScreeningDone={!!intakeExtra?.preScreeningResponse}
            interviewEligible={intakeExtra?.interviewEligible ?? false}
            interviewRequestedAt={intakeExtra?.interviewRequestedAt ?? null}
            interviewCompletedAt={intakeExtra?.interviewCompletedAt ?? null}
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
          {showMatchedRoles && userAge !== null && userAge < 14 ? null : <MatchedRoles />}
          {recentTools.length > 0 && (
            <section style={{ padding:'1.5rem 2rem', borderTop:'1px solid var(--surface-container-high)', maxWidth:'900px', margin:'0 auto' }}>
              <div className="portal-section-header">
                <h2 style={{ fontSize:'1rem', fontWeight:700, margin:0, color:'var(--color-on-surface)' }}>Recent AI Activity</h2>
                <Link href="/dashboard/ai-tools/history" className="portal-section-action">
                  View all
                  <span className="material-symbols-outlined" style={{ fontSize:'0.9rem' }}>arrow_forward</span>
                </Link>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {recentTools.map((r) => (
                  <div key={r.id} className="stitch-card stitch-card--padded-sm" style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'1.25rem', color:'var(--color-accent)', flexShrink:0 }}>smart_toy</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.875rem', fontWeight:600, margin:0, color:'var(--color-on-surface)' }}>{AI_TOOL_LABELS[r.toolType] ?? r.toolType}</p>
                      {r.inputSummary && (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-on-surface-variant)',
                          margin: '0.1rem 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stripMarkdownForPreview(r.inputSummary)}
                      </p>
                    )}
                    </div>
                    <span style={{ fontSize:'0.75rem', color:'var(--color-on-surface-variant)', flexShrink:0 }}>{formatPortalDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </PortalEntryClient>
        </PortalEntryErrorBoundary>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileBottomNav variant="portal" />
    </>
    </DashboardPageErrorBoundary>
  );
}
