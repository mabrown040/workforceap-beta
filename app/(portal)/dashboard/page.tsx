import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
      <div className="md:hidden pb-24">
        {/* Welcome greeting + progress orb */}
        <section className="flex justify-between items-start px-6 pt-6 pb-4">
          <div className="space-y-1 max-w-[60%]">
            <p className="text-[#584144] text-xs font-medium tracking-widest uppercase">Member Dashboard</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1b1b]">
              Welcome back, {firstName}
            </h1>
          </div>
          {/* Progress orb */}
          <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="transparent" stroke="#f2eeed" strokeWidth="6" />
              <circle
                cx="48" cy="48" r="40" fill="transparent"
                stroke="#8c0f37" strokeWidth="6"
                strokeDasharray={orbCircumference}
                strokeDashoffset={orbDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-[#8c0f37]">{mobilePct}%</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#7b5800]">Done</span>
            </div>
          </div>
        </section>

        {/* Next step card */}
        {applicationStatus?.nextStep && (
          <section className="px-6 mb-6">
            <div className="p-[1px] rounded-xl bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d] shadow-sm">
              <div className="bg-[#fcf9f8] rounded-[11px] p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8c0f37]/10 text-[#8c0f37] uppercase tracking-wider">
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
                <button className="w-full bg-gradient-to-r from-[#8c0f37] to-[#ad2c4d] text-white py-3 rounded-md font-bold text-sm tracking-wide active:scale-[0.98] transition-transform">
                  Take Action
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Application journey timeline */}
        <section className="px-6 mb-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Application Journey</h3>
          <div className="relative ml-4 space-y-0">
            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#f2eeed]" />
            {journeySteps.map((step, i) => (
              <div key={i} className={`relative flex items-start gap-5 pb-7 ${step.pending ? 'opacity-40' : ''}`}>
                {step.done ? (
                  <div className="relative z-10 w-6 h-6 rounded-full bg-[#8c0f37] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-xs">check</span>
                  </div>
                ) : step.active ? (
                  <div className="relative z-10 w-6 h-6 rounded-full bg-[#fcf9f8] border-4 border-[#8c0f37] flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#8c0f37] animate-pulse" />
                  </div>
                ) : (
                  <div className="relative z-10 w-6 h-6 rounded-full bg-[#f2eeed] border-2 border-[#debfc2] flex-shrink-0" />
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

        {/* Recommended programs */}
        {recommendedActions.length > 0 && (
          <section className="px-6 mb-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#584144]">Recommended Next Steps</h3>
            {recommendedActions.slice(0, 3).map((action, i) => (
              <div key={i} className="bg-[#f2eeed] rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8c0f37] text-xl">arrow_forward</span>
                <p className="text-sm font-semibold text-[#1c1b1b]">{action.label}</p>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ── Desktop view (hidden on mobile) ── */}
      <div className="hidden md:block">
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
        </PortalEntryClient>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileBottomNav />
    </>
  );
}
