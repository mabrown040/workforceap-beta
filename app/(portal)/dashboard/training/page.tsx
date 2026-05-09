import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getCourseraReadiness } from '@/lib/coursera/config';
import { getDiscoveredProgram, getProgramBySlug } from '@/lib/content/programs';
import type { CourseraDiscoveredCourse } from '@/lib/content/courseraDiscoveredCatalog';
import type { CourseProgressUi } from '@/components/portal/TrainingCourseList';
import TrainingCourseList from '@/components/portal/TrainingCourseList';
import TrainingDataFlowStrip from '@/components/portal/TrainingDataFlowStrip';
import CourseraSyncCard from '@/components/portal/CourseraSyncCard';
import CourseraAccountLinkCard from '@/components/portal/CourseraAccountLinkCard';
import PageHeader from '@/components/portal/PageHeader';
import PortalStatCard from '@/components/portal/PortalStatCard';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import CourseraProgressCard from '@/components/portal/CourseraProgressCard';
import TrackedCourseraLaunchLink from '@/components/portal/TrackedCourseraLaunchLink';
import { trackTrainingTabViewed } from '@/lib/analytics/track';
import { listCourseraIdentityMappingsForUser } from '@/lib/xapi/mappings';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import {
  averageProgramProgressFromB4B,
  fetchLearnerProgressFromB4B,
  filterRecognizedCourseraCourseIds,
  getLearnerProgressLastActivity,
  type LearnerProgressByContent,
} from '@/lib/coursera/learnerProgress';
import RefreshCourseraProgressButton from '@/components/portal/RefreshCourseraProgressButton';
import TrainingProgramTabs from '@/components/portal/TrainingProgramTabs';
import { canBypassMemberAssessment } from '@/lib/auth/roles';
import StaffViewBanner from '@/components/portal/StaffViewBanner';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'My Training',
  description: 'Complete your courses and track your progress toward getting job-ready.',
  path: '/dashboard/training',
});
}

/**
 * Server-rendered "X minutes ago" label for the Coursera freshness chip.
 * Kept inline (rather than a shared component) because it's only used
 * here and the page is a server component; no need for a `'use client'`
 * boundary just to format a date.
 */
function RelativeFreshness({ when }: { when: Date }) {
  const diffMs = Date.now() - when.getTime();
  if (diffMs < 60_000) return <>just now</>;
  if (diffMs < 3_600_000) {
    const m = Math.round(diffMs / 60_000);
    return <>{m} minute{m === 1 ? '' : 's'} ago</>;
  }
  if (diffMs < 86_400_000) {
    const h = Math.round(diffMs / 3_600_000);
    return <>{h} hour{h === 1 ? '' : 's'} ago</>;
  }
  const d = Math.round(diffMs / 86_400_000);
  return <>{d} day{d === 1 ? '' : 's'} ago</>;
}

export default async function TrainingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; program?: string }>;
}) {
  const params = await searchParams;
  const launchError = params?.error === 'launch_failed';
  const requestedProgramSlug = typeof params?.program === 'string' ? params.program.trim() : '';
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/training');

  // Multi-program: pull all enrollments (primary first), not just
  // User.enrolledProgram. The active program is either ?program=<slug>
  // (must be one of the user's enrollments) or the primary enrollment.
  const dbUserPromise = prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      assessmentCompleted: true,
      // Read-only signal for the new "Enroll in this course" tri-state.
      // The button itself is server-gated again at the route layer; this
      // selection is only a cache so the SSR HTML doesn't render an
      // Enroll button for unapproved members in the first place.
      courseraEnrollmentApproved: true,
      courseEnrollments: {
        select: {
          id: true,
          programSlug: true,
          isPrimary: true,
          enrolledAt: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
      },
    },
  });

  const [tTraining, dbUser, courseraMappings] = await Promise.all([
    getTranslations('training'),
    dbUserPromise,
    listCourseraIdentityMappingsForUser(user.id).catch((error) => {
      console.warn('[dashboard/training] unable to load Coursera identity mappings:', error);
      return [];
    }),
  ]);

  const enrollments = dbUser?.courseEnrollments ?? [];
  const primaryEnrollment = enrollments.find((e) => e.isPrimary) ?? enrollments[0] ?? null;
  // If ?program=<slug> is one of the user's enrollments, use it; otherwise
  // fall back to the primary, then to User.enrolledProgram (legacy users
  // whose CourseEnrollment row hasn't backfilled yet).
  const matchingRequested = requestedProgramSlug
    ? enrollments.find((e) => e.programSlug === requestedProgramSlug)
    : null;
  const activeProgramSlug =
    matchingRequested?.programSlug ??
    primaryEnrollment?.programSlug ??
    dbUser?.enrolledProgram ??
    null;

  // Staff (super_admin / admin) viewing a member dashboard get a banner
  // and a more-helpful empty state when they're not enrolled themselves.
  // Members still hit the redirect-to-assessment gate below.
  const bypassAssessment = await canBypassMemberAssessment(user.id);

  if (!activeProgramSlug) {
    return (
      <div className="portal-main-content">
        {bypassAssessment && <StaffViewBanner page="training" />}
        <div className="content-card" style={{ maxWidth: '36rem', margin: '2rem auto', textAlign: 'center', padding: '2rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>school</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Training starts after enrollment</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Your counselor will enroll you in a funded program before your Coursera courses unlock. Once enrolled, this page becomes your training hub.
          </p>
          <Link href="/dashboard/program" className="btn btn-primary">Choose my program</Link>
          {bypassAssessment && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(43,123,185,0.06)',
                border: '1px dashed rgba(43,123,185,0.3)',
                borderRadius: '0.75rem',
                textAlign: 'left',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                Staff note: this is the empty state for unenrolled members.
              </p>
              <p style={{ margin: '0 0 0.75rem' }}>
                Your <code>super_admin</code> account isn&apos;t enrolled in a program. To dogfood your own
                Coursera data, open <Link href="/admin/coursera" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>/admin/coursera</Link> →
                Inspect by email → Sync from Coursera, which will create a CourseEnrollment for you.
              </p>
              <Link href="/admin/coursera" className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>
                Open admin Coursera tools
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Members must complete the assessment before training unlocks.
  // Staff (super_admin / admin) bypass — they need to view member surfaces
  // for verification / dogfooding without being forced through the gauntlet.
  if (!dbUser?.assessmentCompleted && !bypassAssessment) {
    redirect('/dashboard/assessment?redirect=/dashboard/training');
  }

  // Per-program data load now keys on the active slug, not enrolledProgram.
  // B4B fetch happens here too so it's keyed on the same active slug — when
  // multi-program lands, switching tabs re-fetches authoritative progress
  // for the new active program. Fail-soft: empty map if B4B is unavailable
  // so the page still renders with local CourseProgress rows.
  const courseraProgramIdForActive =
    DISCOVERED_COURSERA_PROGRAMS[activeProgramSlug]?.courseraProgramId;
  const [progressRows, programRollup, b4bProgress] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: user.id, programSlug: activeProgramSlug },
      select: { courseSlug: true, status: true, percentComplete: true },
    }),
    prisma.memberProgramProgress.findUnique({
      where: { userId_programSlug: { userId: user.id, programSlug: activeProgramSlug } },
      select: { coursesCompleted: true, averagePercent: true },
    }),
    user.email
      ? fetchLearnerProgressFromB4B(user.email, { programId: courseraProgramIdForActive }).catch(
          (error) => {
            console.warn('[dashboard/training] B4B learner progress unavailable:', error);
            return new Map() as LearnerProgressByContent;
          },
        )
      : Promise.resolve(new Map() as LearnerProgressByContent),
  ]);

  trackTrainingTabViewed(user.id);

  const program = getProgramBySlug(activeProgramSlug);
  if (!program) redirect('/dashboard/program');

  const discovered = getDiscoveredProgram(program);
  const coursesWithIds = program.courses.map((c) => ({
    ...c,
    courseraCourseId: discovered?.courses.find((dc: CourseraDiscoveredCourse) => dc.slug === c.slug)?.courseId ?? c.courseraCourseId,
  }));

  // Build the progress map. Local CourseProgress rows seed status (they
  // remain authoritative for completion + non-Coursera courses), then
  // we layer the B4B `overallProgress` over the percent because Coursera
  // refreshes within minutes versus xAPI's hours-to-days lag.
  const progressBySlug: Record<string, CourseProgressUi> = {};
  for (const row of progressRows) {
    progressBySlug[row.courseSlug] = { status: row.status, percentComplete: row.percentComplete };
  }
  // Keep local status when COMPLETED so a manually-completed course
  // can't be "downgraded" by stale B4B; otherwise reflect B4B's completion
  // bit so a recent finish flips to COMPLETED before the background sync writes it.
  for (const c of coursesWithIds) {
    if (!c.courseraCourseId) continue;
    const b4bEntry = b4bProgress.get(c.courseraCourseId);
    if (!b4bEntry) continue;
    const existing = progressBySlug[c.slug];

    let nextStatus: CourseProgressUi['status'];
    if (existing?.status === 'COMPLETED' || b4bEntry.isCompleted) {
      nextStatus = 'COMPLETED';
    } else if (b4bEntry.overallProgress > 0) {
      nextStatus = 'IN_PROGRESS';
    } else {
      nextStatus = existing?.status ?? 'NOT_STARTED';
    }

    progressBySlug[c.slug] = {
      status: nextStatus,
      percentComplete: b4bEntry.isCompleted
        ? 100
        : Math.max(b4bEntry.overallProgress, existing?.percentComplete ?? 0),
    };
  }

  const coursesCompleted = Object.entries(progressBySlug)
    .filter(([, row]) => row.status === 'COMPLETED')
    .map(([slug]) => slug);
  const completedFromRows = program.courses.filter((c) => progressBySlug[c.slug]?.status === 'COMPLETED').length;
  const completedCount =
    programRollup != null
      ? Math.max(programRollup.coursesCompleted, completedFromRows)
      : completedFromRows;
  // Prefer the average across B4B `overallProgress` when every course in
  // the program has fresh authoritative data so the hero number matches
  // the learner's view inside Coursera. All-or-nothing logic lives in
  // averageProgramProgressFromB4B.
  const b4bAverage = averageProgramProgressFromB4B({
    progress: b4bProgress,
    courseraCourseIds: filterRecognizedCourseraCourseIds(coursesWithIds.map((c) => c.courseraCourseId)),
  });
  const progressPct = (() => {
    if (b4bAverage != null) return b4bAverage;
    if (program.courses.length === 0) return 0;
    if (programRollup != null) return programRollup.averagePercent;
    return Math.round((completedFromRows / program.courses.length) * 100);
  })();

  const b4bLastActivity = getLearnerProgressLastActivity(b4bProgress);
  const b4bHasData = b4bProgress.size > 0;

  const courseraReadiness = getCourseraReadiness(activeProgramSlug);
  const savedCourseraEmail = courseraMappings.find((mapping) => mapping.courseraEmail)?.courseraEmail ?? null;

  // Multi-program: tabs only render when the user has 2+ enrollments.
  // Single-enrollment users see the same layout they always did.
  const tabRows = enrollments.map((e) => ({
    id: e.id,
    programSlug: e.programSlug,
    programTitle: getProgramBySlug(e.programSlug)?.title ?? e.programSlug,
    isPrimary: e.isPrimary,
  }));
  const showProgramTabs = tabRows.length > 1;
  const activeIsPrimary = primaryEnrollment?.programSlug === activeProgramSlug;

  const isZeroState = completedCount === 0 && !Object.values(progressBySlug).some((p) => p.status === 'IN_PROGRESS' || (p.percentComplete ?? 0) > 0);

  const zeroStateBanner = (
    <div
      style={{
        background: 'rgba(74,155,79,0.08)',
        border: '1px solid rgba(74,155,79,0.2)',
        borderRadius: '0.75rem',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <span className="material-symbols-outlined" style={{ color: 'var(--color-green)', fontSize: '1.5rem', '--ms-fill': 1 } as object}>
        flag
      </span>
      <div style={{ flex: 1, minWidth: '12rem' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Your path starts here</p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Course 1 of {program.courses.length} is unlocked and ready.
        </p>
      </div>
      <TrackedCourseraLaunchLink
        href="/api/member/coursera/launch"
        className="btn btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
        Start Course 1
      </TrackedCourseraLaunchLink>
    </div>
  );

  return (
    <>
      <div className="portal-main-content">
        <PageHeader
          title={tTraining('myTraining')}
          subtitle={
            <>
              <span className="wa-block md:wa-hidden">Complete your {program.title} courses on Coursera and track your progress. Mark each course done as you finish.</span>
              <span className="wa-hidden md:wa-block">Complete your {program.title} courses on Coursera (our online learning partner). Track your progress and mark courses done as you finish them.</span>
            </>
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: tTraining('myTraining') },
          ]}
        />

        {bypassAssessment && (
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <StaffViewBanner page="training" />
          </div>
        )}

        {showProgramTabs && (
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <TrainingProgramTabs
              tabs={tabRows}
              activeProgramSlug={activeProgramSlug}
              activeIsPrimary={activeIsPrimary}
            />
          </div>
        )}

        {launchError && (
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <div
              style={{
                background: 'rgba(173,44,77,0.08)',
                border: '1px solid rgba(173,44,77,0.2)',
                borderRadius: '0.75rem',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>error_outline</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9375rem' }}>Your Coursera training access is being prepared.</p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  It can take a short time to set up after enrollment. If this message stays for more than a day, <Link href="/dashboard/messages">message your counselor</Link>.
                </p>
              </div>
            </div>
          </div>
        )}

        {isZeroState && (
          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            {zeroStateBanner}
          </div>
        )}

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
          </div>        </div>

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

        {b4bHasData && (
          <div
            style={{
              padding: '0 1rem',
              marginBottom: '0.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span
              data-testid="coursera-progress-freshness"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-on-surface-variant)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1rem', color: 'var(--color-blue)' }}
                aria-hidden="true"
              >
                cloud_done
              </span>
              Updated from Coursera{' '}
              {b4bLastActivity ? <RelativeFreshness when={b4bLastActivity} /> : 'just now'}
            </span>
            <RefreshCourseraProgressButton />
          </div>
        )}

        <div style={{ padding: '0 1rem', marginBottom: '1.25rem' }}>
          <CourseraProgressCard userId={user.id} />
        </div>

        <div style={{ padding: '0 1rem', marginBottom: '1.25rem' }}>
          <CourseraAccountLinkCard portalEmail={user.email ?? ''} initialCourseraEmail={savedCourseraEmail} />
        </div>

        <div style={{ padding: '0 1rem' }}>
          <TrainingDataFlowStrip />
          <details className="training-sync-details">
            <summary>Optional: refresh progress &amp; Coursera tools</summary>
            <div className="training-sync-details__body">
              <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)' }}>
                Pull the latest completion data from Coursera, then keep using this Training page as your single hub for launches and progress.
              </p>
              <CourseraSyncCard enabled={courseraReadiness.canSync} />
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
              programSlug={activeProgramSlug}
              progressBySlug={progressBySlug}
              eligibilityApproved={dbUser?.courseraEnrollmentApproved ?? false}
              // Any course with B4B progress is, by Coursera's definition,
              // already enrolled — `b4bProgress` only contains rows for
              // contentIds the learner has joined. Use the keyset directly.
              enrolledCourseraCourseIds={Array.from(b4bProgress.keys())}
            />
          </section>
        </div>
      </div>
    </>
  );
}
