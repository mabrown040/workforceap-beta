import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import TrainingCourseList from '@/components/portal/TrainingCourseList';
import PageHeader from '@/components/portal/PageHeader';
import PortalStatCard from '@/components/portal/PortalStatCard';
import MobileBottomNav from '@/components/MobileBottomNav';

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
    select: {
      enrolledProgram: true,
      assessmentCompleted: true,
      coursesCompleted: true,
    },
  });

  if (!dbUser?.enrolledProgram) {
    redirect('/dashboard/program');
  }

  if (!dbUser.assessmentCompleted) {
    redirect('/dashboard/assessment?redirect=/dashboard/training');
  }

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) redirect('/dashboard/program');

  const coursesCompleted = (dbUser.coursesCompleted as string[] | null) ?? [];
  const completedSet = new Set(coursesCompleted);
  const completedCount = program.courses.filter((c) => completedSet.has(c.slug)).length;
  const progressPct = program.courses.length > 0 ? Math.round((completedCount / program.courses.length) * 100) : 0;

  return (
    <>
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      <PageHeader
        title="My Training"
        subtitle={`Complete your ${program.title} courses on Coursera (our online learning partner). Track your progress and mark courses done as you finish them.`}
        breadcrumbs={[
          { label: 'Member Portal', href: '/dashboard' },
          { label: 'My Training' },
        ]}
      />

      {/* Stats row */}
      <div className="portal-grid-metrics" style={{ marginBottom: 'var(--space-8)' }}>
        <PortalStatCard
          icon="school"
          label="Current Program"
          value={program.title}
          iconColor="var(--color-accent)"
          iconBg="rgba(173,44,77,0.12)"
        />

        <PortalStatCard
          icon="task_alt"
          label="Courses Completed"
          value={`${completedCount} / ${program.courses.length}`}
          iconColor="var(--color-green)"
          iconBg="rgba(74,155,79,0.12)"
        />

        <PortalStatCard
          icon="trending_up"
          label="Overall Progress"
          value={`${progressPct}%`}
          iconColor="var(--color-blue)"
          iconBg="rgba(43,123,185,0.12)"
        >
          <div style={{ height: '6px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: '0.75rem' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-blue)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-base)' }} />
          </div>
        </PortalStatCard>
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
        }}
      >
        <a
          href="https://coursera.org"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '0.7rem 1.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">open_in_new</span>
          Open Coursera
        </a>
        <a
          href="/dashboard/certifications"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '0.7rem 1.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">workspace_premium</span>
          View Certificates
        </a>
        <a
          href="/dashboard/readiness"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '0.7rem 1.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">work</span>
          Job Readiness
        </a>
      </div>

      {/* Course list section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            menu_book
          </span>
          <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Your Courses</h2>
        </div>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
          {program.title} on Coursera (our online partner). Complete courses in order and mark each one done as you finish.
        </p>

        <TrainingCourseList
          courses={program.courses}
          completedSlugs={coursesCompleted}
        />
      </section>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
