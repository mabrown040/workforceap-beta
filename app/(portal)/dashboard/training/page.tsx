import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import TrainingCourseList from '@/components/portal/TrainingCourseList';
import PageHeader from '@/components/portal/PageHeader';
import PortalStatCard from '@/components/portal/PortalStatCard';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import { getMemberStateSummary } from '@/lib/member/memberStateSummary';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Training',
  description: 'Complete your courses and track your progress toward getting job-ready.',
  path: '/dashboard/training',
});

export default async function TrainingPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/training');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!dbUser?.enrolledProgram) {
    redirect('/dashboard/program');
  }

  if (!dbUser.assessmentCompleted) {
    redirect('/dashboard/assessment?redirect=/dashboard/training');
  }

  const latestApplication = await prisma.application.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const state = getMemberStateSummary(dbUser, latestApplication);
  const program = state.enrolledProgram;

  if (!program) redirect('/dashboard/program');

  return (
    <div className="wa-max-w-[var(--max-width)] wa-mx-auto">
      <PageHeader
        title="My Training"
        subtitle={`Complete your ${program.title} courses on Coursera (our online learning partner). Track your progress and mark courses done as you finish them.`}
        breadcrumbs={[
          { label: 'Member Portal', href: '/dashboard' },
          { label: 'My Training' },
        ]}
      />

      <div className="wa-px-4 md:wa-px-0">
        {/* KPI / Stats Section — Single responsive structure */}
        <div className="wa-grid wa-gap-4 wa-mb-8 md:wa-grid-cols-3">
          {/* Program Info (Hidden icon on mobile for density) */}
          <div className="md:wa-hidden">
            <PortalKpiCard
              accent="neutral"
              label="Current program"
              value={program.title}
              hint="Coursera partner"
            />
          </div>
          <div className="wa-hidden md:wa-block">
            <PortalStatCard
              icon="school"
              label="Current Program"
              value={program.title}
              iconColor="var(--color-accent)"
              iconBg="rgba(173,44,77,0.12)"
            />
          </div>

          {/* Courses Completed */}
          <div className="wa-grid wa-grid-cols-2 wa-gap-3 md:wa-contents">
            <div className="md:wa-hidden">
              <PortalKpiCard
                accent="neutral"
                label="Courses"
                value={`${state.coursesCompletedCount}/${state.totalCoursesCount}`}
                hint="Completed"
              />
            </div>
            <div className="wa-hidden md:wa-block">
              <PortalStatCard
                icon="task_alt"
                label="Courses Completed"
                value={`${state.coursesCompletedCount} / ${state.totalCoursesCount}`}
                iconColor="var(--color-green)"
                iconBg="rgba(74,155,79,0.12)"
              />
            </div>

            {/* Overall Progress */}
            <div className="md:wa-hidden">
              <PortalKpiCard
                accent="accent"
                label="Progress"
                value={`${state.trainingProgressPct}%`}
                hint="Overall"
              />
            </div>
            <div className="wa-hidden md:wa-block">
              <PortalStatCard
                icon="trending_up"
                label="Overall Progress"
                value={`${state.trainingProgressPct}%`}
                iconColor="var(--color-blue)"
                iconBg="rgba(43,123,185,0.12)"
              >
                <div className="wa-h-1.5 wa-bg-[var(--surface-container-highest)] wa-rounded-full wa-overflow-hidden wa-mt-3">
                  <div
                    className="wa-h-full wa-bg-[var(--color-blue)] wa-rounded-full wa-transition-all"
                    style={{ width: `${state.trainingProgressPct}%` }}
                  />
                </div>
              </PortalStatCard>
            </div>
          </div>
        </div>

        {/* Action Buttons — Single responsive flex/grid */}
        <div className="wa-flex wa-flex-col md:wa-flex-row wa-gap-3 wa-mb-8">
          <a
            href="/api/member/coursera/launch"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary wa-inline-flex wa-items-center wa-justify-center wa-gap-2 wa-py-2.5 md:wa-px-6"
          >
            <span className="material-symbols-outlined wa-text-lg">open_in_new</span>
            Open Coursera
          </a>
          <div className="wa-grid wa-grid-cols-2 md:wa-flex wa-gap-3">
            <a
              href="/dashboard/certifications"
              className="btn btn-outline wa-inline-flex wa-items-center wa-justify-center wa-gap-2 wa-py-2.5 md:wa-px-6"
            >
              <span className="material-symbols-outlined wa-text-lg">workspace_premium</span>
              <span className="md:wa-hidden">Certificates</span>
              <span className="wa-hidden md:wa-inline">View Certificates</span>
            </a>
            <a
              href="/dashboard/readiness"
              className="btn btn-outline wa-inline-flex wa-items-center wa-justify-center wa-gap-2 wa-py-2.5 md:wa-px-6"
            >
              <span className="material-symbols-outlined wa-text-lg">work</span>
              <span className="md:wa-hidden">Readiness</span>
              <span className="wa-hidden md:wa-inline">Job Readiness</span>
            </a>
          </div>
        </div>

        {/* Course List Section */}
        <section className="wa-mb-12">
          <div className="wa-flex wa-items-center wa-gap-3 wa-mb-2">
            <span
              className="material-symbols-outlined wa-text-2xl wa-text-[var(--color-accent)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
            <h2 className="wa-text-xl wa-font-bold">Your Courses</h2>
          </div>
          <p className="wa-text-[var(--color-on-surface-variant)] wa-mb-6">
            {program.title} on Coursera (our online partner). Complete courses in order and mark each one done as you finish.
          </p>
          <TrainingCourseList
            courses={program.courses}
            completedSlugs={dbUser.coursesCompleted as string[] ?? []}
            programSlug={dbUser.enrolledProgram ?? undefined}
          />
        </section>
      </div>

      <MobileBottomNav variant="portal" />
    </div>
  );
}
