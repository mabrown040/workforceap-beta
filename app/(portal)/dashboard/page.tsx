import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import DashboardHomeClient from '@/components/portal/DashboardHomeClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Dashboard',
  description: 'Your WorkforceAP member dashboard.',
  path: '/dashboard',
});

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id, deletedAt: null },
    include: { profile: true },
  });

  if (!dbUser) redirect('/login');

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

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions
      .filter((a) => a.href.startsWith('/dashboard/ai-tools'))
      .slice(0, 3);
  } catch {
    suggestedActions = [
      { label: 'Build your resume', href: '/dashboard/ai-tools/resume-rewriter' },
      { label: 'Practice interview questions', href: '/dashboard/ai-tools/interview-practice' },
      { label: 'Log your first application', href: '/dashboard/ai-tools/application-tracker' },
    ];
  }

  return (
    <>
      <DashboardHomeClient
        suggestedActions={suggestedActions}
        firstName={firstName}
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
      />
    </>
  );
}
