import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import TrainingCourseList from '@/components/portal/TrainingCourseList';

export const metadata: Metadata = buildPageMetadata({
  title: 'Training & Job Readiness',
  description: 'Access your Coursera courses and track job-readiness milestones.',
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
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-on-surface-variant)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <a href="/dashboard" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Member Portal</a>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chevron_right</span>
        <span>Training &amp; Job Readiness</span>
      </nav>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-accent)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 'var(--space-2)',
            }}
          >
            WAP Training
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-tight)', margin: 0, marginBottom: 'var(--space-2)' }}>
            Training &amp; Job Readiness
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '560px', margin: 0 }}>
            Complete your {program.title} courses on Coursera. Track progress, mark courses complete, and prepare for the workforce.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Program card */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '2rem',
              color: 'var(--color-accent)',
              background: 'rgba(173,44,77,0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            school
          </span>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Current Program</div>
            <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)' }}>{program.title}</div>
          </div>
        </div>

        {/* Courses completed */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '2rem',
              color: 'var(--color-green)',
              background: 'rgba(74,155,79,0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            task_alt
          </span>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Courses Completed</div>
            <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: '1.5rem' }}>{completedCount} <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-on-surface-variant)' }}>/ {program.courses.length}</span></div>
          </div>
        </div>

        {/* Progress */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '2rem',
                color: 'var(--color-blue)',
                background: 'rgba(43,123,185,0.12)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              trending_up
            </span>
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Overall Progress</div>
              <div style={{ fontWeight: 'var(--font-weight-bold)', fontSize: '1.25rem' }}>{progressPct}%</div>
            </div>
          </div>
          <div style={{ height: '6px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-blue)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-base)' }} />
          </div>
        </div>
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
          View Certifications
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
          {program.title} — Coursera. Complete courses in order and mark them done as you go.
        </p>

        <TrainingCourseList
          courses={program.courses}
          completedSlugs={coursesCompleted}
        />
      </section>
    </div>
  );
}
