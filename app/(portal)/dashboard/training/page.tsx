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
        {/* Mobile */}
        <div className="wa-md:wa-hidden" style={{ padding: '0.75rem 1rem 6rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              className="wa-text-[11px] wa-uppercase wa-tracking-[0.12em] wa-font-semibold"
              style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem' }}
            >
              Member Portal / My Training
            </p>
            <h1 className="wa-text-2xl wa-font-extrabold wa-tracking-tight" style={{ color: 'var(--color-on-surface)', lineHeight: 1.1 }}>
              My Training
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.35rem', lineHeight: 1.5, fontSize: '0.9rem' }}>
              Complete your {program.title} courses on Coursera and mark each course done as you finish.
            </p>
          </div>

          {/* Compact KPI strip */}
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <div style={{ minWidth: 220, flexShrink: 0 }}>
              <PortalKpiCard accent="accent" label="Current program" value={program.title} hint="Coursera partner" />
            </div>
            <div style={{ minWidth: 140, flexShrink: 0 }}>
              <PortalKpiCard accent="neutral" label="Courses" value={`${completedCount}/${program.courses.length}`} hint="Completed" />
            </div>
            <div style={{ minWidth: 140, flexShrink: 0 }}>
              <PortalKpiCard accent="accent" label="Progress" value={`${progressPct}%`} hint="Overall" />
            </div>
          </div>

          {/* Actions (dense) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
            <a
              href="https://coursera.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>open_in_new</span>
              Open Coursera
            </a>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <a
                href="/dashboard/certifications"
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>workspace_premium</span>
                Certificates
              </a>
              <a
                href="/dashboard/readiness"
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 0.75rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>work</span>
                Readiness
              </a>
            </div>
          </div>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
              <h2 className="wa-text-lg wa-font-extrabold wa-tracking-tight" style={{ margin: 0, color: 'var(--color-on-surface)' }}>
                Your Courses
              </h2>
            </div>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
              Complete courses in order and mark each one done.
            </p>
            <TrainingCourseList courses={program.courses} completedSlugs={coursesCompleted} />
          </section>

          <MobileBottomNav variant="portal" />
        </div>

        {/* Desktop */}
        <div className="wa-hidden wa-md:wa-block">
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
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>workspace_premium</span>
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>work</span>
              Job Readiness
            </a>
          </div>

          {/* Course list section */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
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
      </div>
    </>
  );
}
