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
import PortalKpiCard from '@/components/portal/PortalKpiCard';

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

        {/* Mobile-only KPI strip — compact summary above the actions */}
        <div className="md:wa-hidden" style={{ padding: '0.75rem 1rem 0' }}>
          <div style={{ display: 'grid', gap: '0.75rem', paddingBottom: '0.25rem' }}>
            <div
              className="portal-kpi-card"
              style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
            >
              <p className="portal-kpi-card__label">Current program</p>
              <p
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  margin: 0,
                  color: 'var(--color-accent)',
                  overflowWrap: 'anywhere',
                }}
              >
                {program.title}
              </p>
              <p className="portal-kpi-card__hint">Coursera partner</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
              <PortalKpiCard accent="neutral" label="Courses" value={`${completedCount}/${program.courses.length}`} hint="Completed" />
              <PortalKpiCard accent="accent" label="Progress" value={`${progressPct}%`} hint="Overall" />
            </div>
          </div>
        </div>

        {/* Desktop-only stats row — same data, richer layout */}
        <div className="wa-hidden md:wa-block">
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
        </div>

        {/* Quick actions — single render, responsive layout via flex-wrap */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap',
            padding: '0 1rem',
          }}
        >
          <a
            href="/api/member/coursera/launch"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '0.7rem 1.5rem',
              flex: '1 1 auto',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>open_in_new</span>
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
              flex: '1 1 auto',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>workspace_premium</span>
            <span className="md:wa-hidden">Certificates</span>
            <span className="wa-hidden md:wa-inline">View Certificates</span>
          </a>
          <a
            href="/dashboard/readiness"
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '0.7rem 1.5rem',
              flex: '1 1 auto',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>work</span>
            <span className="md:wa-hidden">Readiness</span>
            <span className="wa-hidden md:wa-inline">Job Readiness</span>
          </a>
        </div>

        {/* Course list — single render. Closes audit #28 / #34 / #61 / #107 family
            (TrainingCourseList previously rendered twice in DOM with CSS hiding
            one variant, producing 32 H3s for a 16-course program). */}
        <section style={{ padding: '0 1rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }}>
              menu_book
            </span>
            <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Your Courses</h2>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
            Complete courses in order and mark each one done.
          </p>
          <TrainingCourseList courses={program.courses} completedSlugs={coursesCompleted} />
        </section>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
