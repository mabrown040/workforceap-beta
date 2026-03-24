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

  return (
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
      />
      {showMatchedRoles && <MatchedRoles />}
    </PortalEntryClient>
  );
}
