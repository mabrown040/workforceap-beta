import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { getCourseraReadiness } from '@/lib/coursera/config';
import { getDiscoveredProgram, getProgramBySlug } from '@/lib/content/programs';
import type { CourseProgressUi } from '@/components/portal/TrainingCourseList';
import TrainingCourseList from '@/components/portal/TrainingCourseList';
import TrainingDataFlowStrip from '@/components/portal/TrainingDataFlowStrip';
import CourseraSyncCard from '@/components/portal/CourseraSyncCard';
import PageHeader from '@/components/portal/PageHeader';
import PortalStatCard from '@/components/portal/PortalStatCard';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import CourseraProgressCard from '@/components/portal/CourseraProgressCard';
import TrackedCourseraLaunchLink from '@/components/portal/TrackedCourseraLaunchLink';
import { trackTrainingTabViewed } from '@/lib/analytics/track';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'My Training',
  description: 'Complete your courses and track your progress toward getting job-ready.',
  path: '/dashboard/training',
});
}

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

  trackTrainingTabViewed(user.id);

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) redirect('/dashboard/program');

  const discovered = getDiscoveredProgram(program);
  const coursesWithIds = program.courses.map((c) => ({
    ...c,
    courseraCourseId: discovered?.courses.find((dc) => dc.slug === c.slug)?.courseId ?? c.courseraCourseId,
  }));

  const [progressRows, programRollup] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: user.id, programSlug: dbUser.enrolledProgram },
      select: { courseSlug: true, status: true, percentComplete: true },
    }),
    prisma.memberProgramProgress.findUnique({
      where: {
        userId_programSlug: { userId: user.id, programSlug: dbUser.enrolledProgram },
      },
      select: { coursesCompleted: true, averagePercent: true },
    }),
  ]);

  const progressBySlug: Record<string, CourseProgressUi> = {};
  for (const row of progressRows) {
    progressBySlug[row.courseSlug] = { status: row.status, percentComplete: row.percentComplete };
  }

  const coursesCompleted = (dbUser.coursesCompleted as string[] | null) ?? [];
  const completedSet = new Set(coursesCompleted);
  const completedFromRows = program.courses.filter((c) => {
    const p = progressBySlug[c.slug];
    return p?.status === 'COMPLETED' || completedSet.has(c.slug);
  }).length;
  const completedCount =
    programRollup != null ? programRollup.coursesCompleted : completedFromRows;
  const progressPct =
    programRollup != null && program.courses.length > 0
      ? programRollup.averagePercent
      : program.courses.length > 0
        ? Math.round((completedFromRows / program.courses.length) * 100)
        : 0;

  const courseraReadiness = getCourseraReadiness(dbUser.enrolledProgram);

  return (
    <>
      <div className="portal-main-content">
        <PageHeader
          title="My Training"
          subtitle={
            <>
              <span className="wa-block md:wa-hidden">Complete your {program.title} courses on Coursera and mark each course done as you finish.</span>
              <span className="wa-hidden md:wa-block">Complete your {program.title} courses on Coursera (our online learning partner). Track your progress and mark courses done as you finish them.</span>
            </>
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'My Training' },
          ]}
        />

        {/* Mobile */}
        <div className="md:wa-hidden" style={{ padding: '0.75rem 1rem 6rem' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
            <TrackedCourseraLaunchLink
              href="/api/member/coursera/launch"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>open_in_new</span>
              Open Coursera
            </TrackedCourseraLaunchLink>
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
          <MobileBottomNav variant="portal" />
        </div>

        {/* Desktop */}
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

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-8)',
              flexWrap: 'wrap',
            }}
          >
            <TrackedCourseraLaunchLink
              href="/api/member/coursera/launch"
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
            </TrackedCourseraLaunchLink>
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
        </div>

        <div style={{ padding: '0 1rem', marginBottom: '1.25rem' }}>
          <CourseraProgressCard userId={user.id} />
        </div>

        <div style={{ padding: '0 1rem' }}>
          <TrainingDataFlowStrip />
          <details className="training-sync-details">
            <summary>Optional: refresh progress &amp; Coursera tools</summary>
            <div className="training-sync-details__body">
              <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)' }}>
                Pull the latest completion data from Coursera, or open the full Coursera hub for launches and partner notes.
              </p>
              <CourseraSyncCard enabled={courseraReadiness.canSync} />
              <p style={{ margin: 'var(--space-4) 0 0' }}>
                <Link href="/dashboard/coursera" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>hub</span>
                  Open Coursera hub
                </Link>
              </p>
            </div>
          </details>

          <section
            className="portal-card portal-card--flat"
            style={{ borderLeft: '4px solid var(--color-blue)', marginTop: '1.25rem' }}
          >
            <div className="portal-card__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-blue)', '--ms-fill': 1 }}>
                  route
                </span>
                <h2 className="portal-section-heading" style={{ margin: 0, fontSize: '1rem' }}>What happens after I start?</h2>
              </div>
              <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
                Finish your courses in order. As you progress, WorkforceAP uses that momentum to support certificates, resume upgrades, interview prep, and job applications.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                <li>Start with your current Coursera course.</li>
                <li>Certificates from Coursera appear automatically in your vault as you complete courses.</li>
                <li>Use readiness + AI tools alongside training so job help starts earlier.</li>
              </ul>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '1rem' }}>
                <a href="/dashboard/guide" className="btn btn-outline">View full guide</a>
                <a href="/dashboard/certifications" className="btn btn-outline">Open certificates</a>
              </div>
            </div>
          </section>
        </div>

        {/* Shared course list - rendered once to avoid duplication */}
        <div style={{ padding: '0 1rem' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>
                menu_book
              </span>
              <h2 className="portal-section-heading" style={{ margin: 0 }}>Your Courses</h2>
            </div>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
              {program.title} on Coursera (our online partner). Complete courses in order; progress updates when Coursera sends activity, and you can still mark a course done manually if needed.
            </p>
            <TrainingCourseList
              courses={coursesWithIds}
              completedSlugs={coursesCompleted}
              programSlug={dbUser.enrolledProgram}
              progressBySlug={progressBySlug}
            />
          </section>
        </div>
      </div>
    </>
  );
}
