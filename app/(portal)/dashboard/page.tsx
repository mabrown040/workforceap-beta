import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadMemberCareerBriefBundle } from '@/lib/content/careerBriefPersonalization';
import { prisma } from '@/lib/db/prisma';
import { buildMemberApplicationStatusView } from '@/lib/member/memberApplicationStatus';
import DashboardHomeClient from '@/components/portal/DashboardHomeClient';
import MatchedRoles from '@/components/portal/MatchedRoles';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { MEMBER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member overview',
  description: 'Your WorkforceAP member portal overview.',
  path: '/dashboard',
});

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  const { user: dbUser, careerBrief } = await loadMemberCareerBriefBundle(user.id, { activeMemberOnly: true });
  if (!dbUser) redirect('/login');

  const intakeExtra = await prisma.user.findUnique({
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

  const recentTools = await prisma.aIToolResult.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, toolType: true, inputSummary: true, createdAt: true },
  });

  const latestApplication = await prisma.application.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      programInterest: true,
      submittedAt: true,
      createdAt: true,
    },
  });

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
        showResponseEstimate: applicationStatusView.showResponseEstimate,
        progressIndex: applicationStatusView.progressIndex,
      }
    : null;
  const noApplicationOnFile = !latestApplication;

  const firstName = dbUser.fullName?.split(' ')[0] ?? 'there';
  const enrolledProgram = dbUser.enrolledProgram ?? null;
  const assessmentCompleted = dbUser.assessmentCompleted ?? false;
  const coursesCompleted = (dbUser.coursesCompleted as string[] | null) ?? [];
  
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
  const superAdmin = await isSuperAdmin(user.id);

  /* Mobile progress percentage for orb */
  const mobilePct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
  const orbCircumference = 251.2;
  const orbDashoffset = orbCircumference - (orbCircumference * mobilePct) / 100;

  const AI_TOOL_LABELS: Record<string, string> = {
    job_match_scorer: 'Job Match Scorer',
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

  /* Journey timeline steps derived from applicationStatus */
  const journeySteps = [
    { label: 'Profile Verified', done: true },
    {
      label: applicationStatus?.nextStep ?? 'Assessment',
      done: assessmentCompleted,
      active: !assessmentCompleted,
      detail: assessmentCompleted ? 'Completed' : 'Active Task • 45 mins',
    },
    { label: 'Interview Scheduled', done: false, pending: !assessmentCompleted },
    { label: 'Enrollment Confirmed', done: false, pending: true },
  ];

  return (
    <>
      {/* ── Mobile-only hero + dashboard (≤640px) ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Welcome greeting + progress orb */}
        <section style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"1.5rem 1.5rem 1rem" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem", maxWidth:"60%" }}>
            <p className="text-[#584144] text-xs font-medium tracking-widest uppercase">Member Dashboard</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1b1b]">
              Welcome back, {firstName}
            </h1>
          </div>
          {/* Progress orb */}
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", width:"5rem", height:"5rem", flexShrink:0 }}>
            <svg style={{ width:"100%", height:"100%", transform:"rotate(-90deg)" }} viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="transparent" stroke="#f2eeed" strokeWidth="6" />
              <circle
                cx="48" cy="48" r="40" fill="transparent"
                stroke="var(--color-accent)" strokeWidth="6"
                strokeDasharray={orbCircumference}
                strokeDashoffset={orbDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span className="text-base font-bold text-[#8c0f37]">{mobilePct}%</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#7b5800]">Done</span>
            </div>
          </div>
        </section>

        {/* Next step card */}
        {applicationStatus?.nextStep && (
          <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem" }}>
            <div style={{ padding:"1px", borderRadius:"0.75rem", background:"linear-gradient(135deg,var(--color-accent),var(--color-accent))", boxShadow:"0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ background:"var(--surface-container-lowest)", borderRadius:"11px", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem" }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ display:"inline-flex", alignItems:"center", padding:"0.125rem 0.5rem", borderRadius:"9999px", background:"color-mix(in srgb, var(--color-accent) 10%, transparent)", color:"var(--color-accent)" }}>
                      Priority
                    </span>
                    <h2 className="text-lg font-bold text-[#1c1b1b] tracking-tight">
                      {applicationStatus.nextStep}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined text-[#7b5800] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <p className="text-[#584144] text-sm leading-relaxed">
                  Your next action for{' '}
                  {applicationStatus.programInterest ?? program?.title ?? 'your program'}.
                </p>
                <button className="font-bold text-sm tracking-wide active:scale-[0.98] transition-transform" style={{ width:"100%", background:"linear-gradient(135deg,var(--color-accent),var(--color-accent))", color:"white", padding:"0.75rem", borderRadius:"0.375rem", border:"none", cursor:"pointer" }}>
                  Take Action
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Application journey timeline */}
        <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Application Journey</h3>
          <div style={{ position:"relative", marginLeft:"1rem" }}>
            <div style={{ position:"absolute", left:"11px", top:"0.5rem", bottom:"0.5rem", width:"2px", background:"#f2eeed" }} />
            {journeySteps.map((step, i) => (
              <div key={i} style={{ position:"relative", display:"flex", alignItems:"flex-start", gap:"1.25rem", paddingBottom:"1.75rem", opacity: step.pending ? 0.4 : 1 }}>
                {step.done ? (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"var(--color-accent)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span className="material-symbols-outlined" style={{ color:"white", fontSize:"0.75rem" }}>check</span>
                  </div>
                ) : step.active ? (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"var(--surface-container-lowest)", border:"4px solid #8c0f37", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ width:"0.5rem", height:"0.5rem", borderRadius:"9999px", background:"var(--color-accent)" }} />
                  </div>
                ) : (
                  <div style={{ position:"relative", zIndex:10, width:"1.5rem", height:"1.5rem", borderRadius:"9999px", background:"#f2eeed", border:"2px solid #debfc2", flexShrink:0 }} />
                )}
                <div>
                  <p className={`font-bold text-sm leading-none mb-1 ${step.active ? 'text-[#8c0f37]' : 'text-[#1c1b1b]'}`}>
                    {step.label}
                  </p>
                  {step.detail && <p className="text-xs text-[#584144]">{step.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended programs — horizontal scroll cards */}
        <section style={{ marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 1.5rem" }}>
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Recommended Programs</h3>
            <a href="/programs" className="text-xs font-bold text-[#8c0f37]" style={{ textDecoration:"none" }}>View All</a>
          </div>
          <div style={{ display:"flex", gap:"1rem", overflowX:"auto", padding:"0 1.5rem 0.5rem", scrollbarWidth:"none", msOverflowStyle:"none" }}>
            {[
              { provider: 'IBM Professional', title: 'Data Science Professional' },
              { provider: 'Amazon Web Services', title: 'Cloud Practitioner Essentials' },
              { provider: 'Google', title: 'Cybersecurity Professional' },
            ].map((prog, i) => (
              <div key={i} style={{ minWidth:"220px", borderRadius:"0.75rem", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 1px 3px rgba(0,0,0,0.08)", flexShrink:0, background:"var(--surface-container)" }}>
                <div style={{ height:"7rem", position:"relative", background:"linear-gradient(135deg, #2b1f20 0%, #584144 100%)" }}>
                </div>
                <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.25rem" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>{prog.provider}</p>
                  <h4 className="font-bold text-sm text-[#1c1b1b] leading-tight">{prog.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions 2x2 grid */}
        <section style={{ padding:"0 1.5rem", marginBottom:"1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Quick Actions</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
            {[
              { icon: 'upload_file', label: 'Upload Resume', href: '/dashboard/ai-tools/resume-rewriter' },
              { icon: 'event_available', label: 'Book Coaching', href: '/dashboard' },
              { icon: 'forum', label: 'Practice Interview', href: '/dashboard/ai-tools/interview-practice' },
              { icon: 'psychology', label: 'AI Resume Help', href: '/dashboard/ai-tools' },
            ].map((action) => (
              <a key={action.label} href={action.href}
                className="active:scale-[0.97] transition-transform" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"1rem", borderRadius:"0.75rem", textDecoration:"none", background:"#ffffff", border:"1px solid rgba(222,191,194,0.3)", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <span className="material-symbols-outlined" style={{ marginBottom:"0.5rem", color:"var(--color-accent)" }}>{action.icon}</span>
                <span className="text-[11px] font-bold text-[#1c1b1b] tracking-tight">{action.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Recent AI Activity */}
        {recentTools.length > 0 && (
          <section style={{ padding:'0 1.5rem', marginBottom:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Recent AI Activity</h3>
              <Link href="/dashboard/ai-tools/history" className="text-xs font-bold text-[#8c0f37]" style={{ textDecoration:'none' }}>View all →</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {recentTools.map((r) => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem', borderRadius:'0.75rem', background:'#ffffff', border:'1px solid rgba(222,191,194,0.3)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'1.1rem', color:'var(--color-accent)', flexShrink:0 }}>smart_toy</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="text-xs font-bold text-[#1c1b1b] leading-tight">{AI_TOOL_LABELS[r.toolType] ?? r.toolType}</p>
                    {r.inputSummary && <p className="text-[11px] text-[#584144] leading-snug truncate" style={{ marginTop:'0.1rem' }}>{r.inputSummary}</p>}
                  </div>
                  <span className="text-[10px] text-[#584144] whitespace-nowrap" style={{ flexShrink:0 }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Desktop view (hidden on mobile) ── */}
      <div className="wa-hidden wa-md:wa-block">
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
          <DashboardHomeClient
            recommendedActions={recommendedActions}
            jobSearchUrl={jobSearchUrl}
            firstName={firstName}
            assessmentDone={assessmentCompleted}
            preScreeningDone={!!intakeExtra?.preScreeningResponse}
            interviewEligible={intakeExtra?.interviewEligible ?? false}
            interviewRequestedAt={intakeExtra?.interviewRequestedAt ?? null}
            interviewCompletedAt={intakeExtra?.interviewCompletedAt ?? null}
            state={
              !enrolledProgram
                ? 'A'
                : !assessmentCompleted
                ? 'B'
                : allCoursesComplete
                ? 'D'
                : 'C'
            }
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
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                <h2 style={{ fontSize:'1rem', fontWeight:700, margin:0, color:'var(--color-on-surface)' }}>Recent AI Activity</h2>
                <Link
                  href="/dashboard/ai-tools/history"
                  style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.8rem', fontWeight:600, color:'var(--color-accent)', textDecoration:'none' }}
                >
                  View all
                  <span className="material-symbols-outlined" style={{ fontSize:'0.9rem' }}>arrow_forward</span>
                </Link>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {recentTools.map((r) => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem 1rem', borderRadius:'10px', background:'var(--surface-container-low)', border:'1px solid var(--surface-container-high)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'1.25rem', color:'var(--color-accent)', flexShrink:0 }}>smart_toy</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:'0.875rem', fontWeight:600, margin:0, color:'var(--color-on-surface)' }}>{AI_TOOL_LABELS[r.toolType] ?? r.toolType}</p>
                      {r.inputSummary && <p style={{ fontSize:'0.8rem', color:'var(--color-on-surface-variant)', margin:'0.1rem 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.inputSummary}</p>}
                    </div>
                    <span style={{ fontSize:'0.75rem', color:'var(--color-on-surface-variant)', flexShrink:0 }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </PortalEntryClient>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileBottomNav variant="portal" />
    </>
  );
}
