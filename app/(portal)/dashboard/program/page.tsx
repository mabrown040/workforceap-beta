import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import ProgramPicker from '@/components/portal/ProgramPicker';
import { ProgramIcon } from '@/components/ProgramIcon';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import PortalCard from '@/components/portal/ui/PortalCard';
import ProgramChangeRequestModal from '@/components/portal/ProgramChangeRequestModal';
import { canBypassMemberAssessment } from '@/lib/auth/roles';
import StaffViewBanner from '@/components/portal/StaffViewBanner';
import { formatDate } from '@/lib/i18n/date';
import { MemberProgramKit } from '@/components/portal/kit/pages/member/MemberProgramKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('programMetaTitle'),
    description: t('programMetaDesc'),
    path: '/dashboard/program',
  });
}

export default async function ProgramPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/program');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  const activeViews = await getActivePrograms();
  let pickerPrograms = activeViews
    .map((v) => v.static)
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (pickerPrograms.length === 0) pickerPrograms = PROGRAMS;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      enrolledAt: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
      // Multi-program: workspace metadata lives on the primary enrollment
      // (matches /dashboard/program/start). Returns 0 or 1 row.
      courseEnrollments: {
        where: { isPrimary: true },
        select: {
          id: true,
          workspaceEmail: true,
          workspaceEmailProvisioned: true,
          enrolledAt: true,
        },
        take: 1,
      },
    },
  });

  const enrolledSlug = dbUser?.enrolledProgram ?? null;
  const program = enrolledSlug ? getProgramBySlug(enrolledSlug) : null;
  const staffViewer = await canBypassMemberAssessment(user.id);
  const otherPrograms = pickerPrograms.filter((p) => p.slug !== enrolledSlug);
  const pendingRequest = await prisma.programChangeRequest.findFirst({
    where: { userId: user.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  // Product stake: members can choose an initial program, but self-serve switching should not
  // become a public free-for-all. Keep later reassignment counselor/admin-driven.
  if (!enrolledSlug || !program) {
    return (
      <>
        <div className="portal-pad-x" style={{ paddingBottom: '6rem' }}>
          {staffViewer && <StaffViewBanner page="program" />}
          <PageHeader
            title="Choose your program"
            subtitle="Pick your track. Funding covers one program at a time — your counselor can help you switch later if your goals change."
            breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'My Program' }]}
          />
          <ProgramPicker programs={pickerPrograms.length ? pickerPrograms : []} />
        </div>
        <MobileBottomNav variant="portal" />
      </>
    );
  }

  const courseraProgramId = DISCOVERED_COURSERA_PROGRAMS[enrolledSlug]?.courseraProgramId;
  const b4bProgress =
    user.email && enrolledSlug
      ? await fetchLearnerProgressFromB4B(user.email, {
          programId: courseraProgramId,
        }).catch((err: unknown) => {
          console.warn('[dashboard/program] B4B learner progress unavailable:', err);
          return new Map();
        })
      : new Map();

  const trainingView = await loadMemberProgramTrainingView({
    userId: user.id,
    programSlug: enrolledSlug,
    b4bProgress,
  });
  const completedSet = new Set(trainingView?.completedSlugsAuthoritative ?? []);
  const completedCount = trainingView?.completedCount ?? 0;
  const nextCourseSlug =
    trainingView?.nextIncompleteCourseSlug ??
    program.courses.find((c) => !completedSet.has(c.slug))?.slug ??
    null;

  // ── v2 KIT is the DEFAULT for the My Program page (real data); legacy view
  // stays reachable via ?ui=legacy. Reuses the enrollment/progress already
  // loaded above. Renders only when a program is actually enrolled — the
  // unenrolled "choose your program" picker above keeps its own legacy UI.
  if (requestedUi !== 'legacy') {
    const totalCourses = program.courses.length;
    const progressPercent =
      trainingView?.progressPercentDisplay ??
      (totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0);

    // Per-course state: completed → done, the resolved "next" course → active,
    // everything else → locked. Mirrors the legacy course-list logic below.
    const modules = program.courses.map((c) => {
      const done = completedSet.has(c.slug);
      const isNext = !done && c.slug === nextCourseSlug;
      return {
        title: c.name,
        state: done ? ('done' as const) : isNext ? ('active' as const) : ('locked' as const),
      };
    });

    // Remaining effort estimate from the static catalog hours on not-yet-done
    // courses (readily available; no extra query).
    const hoursRemaining = program.courses
      .filter((c) => !completedSet.has(c.slug))
      .reduce((sum, c) => sum + (c.estimatedHours ?? 0), 0);

    return (
      <MemberProgramKit
        programTitle={program.title}
        progressPercent={progressPercent}
        modulesComplete={completedCount}
        modulesTotal={totalCourses}
        estRemaining={hoursRemaining > 0 ? `${hoursRemaining} hrs remaining` : 'Almost done'}
        resumeHref="/dashboard"
        modules={modules}
        // Live session + missions aren't loaded on this route — keep the kit
        // defaults and point the missions CTA at the training home.
        missionsHref="/dashboard"
      />
    );
  }

  return (
    <>
      <div className="portal-pad-x" style={{ paddingBottom: '6rem' }}>
        {staffViewer && <StaffViewBanner page="program" />}
        <PageHeader
          title="My Program"
          subtitle={dbUser?.enrolledAt ? `Enrolled ${formatDate(dbUser.enrolledAt)}` : undefined}
          breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'My Program' }]}
        />

        <PortalCard>
          <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
              Coursera & training email
            </p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', lineHeight: 1.55 }}>
              {dbUser?.courseEnrollments?.[0]?.workspaceEmailProvisioned || dbUser?.workspaceEmailProvisioned
                ? 'Your WorkforceAP training seat is on file. Use the training email below when opening Coursera links so progress syncs.'
                : 'Staff still provisions Coursera under your assigned WorkforceAP workspace email when your seat is ready — watch Counselor Chat for the exact address.'}
            </p>
            {(dbUser?.courseEnrollments?.[0]?.workspaceEmail || dbUser?.workspaceEmail) && (
              <p style={{ margin: '0.5rem 0 0', fontWeight: 700, wordBreak: 'break-all' }}>
                {dbUser?.courseEnrollments?.[0]?.workspaceEmail ?? dbUser?.workspaceEmail}
              </p>
            )}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Link href="/dashboard/program/start" className="btn btn-outline btn-small">
                Path to certification
              </Link>
              <Link href="/dashboard" className="btn btn-primary btn-small">
                Open Training
              </Link>
            </div>
          </div>
          <div className="dashboard-program-detail" style={{ borderLeft: `4px solid ${program.borderColor}` }}>
            <div className="dashboard-program-detail-header">
              <span className="dashboard-program-detail-icon">
                <ProgramIcon program={program} size={28} />
              </span>
              <div>
                <h2 className="portal-section-heading" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                  {program.title}
                </h2>
                <span
                  style={{
                    background: program.categoryColor,
                    color: 'white',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {program.categoryLabel}
                </span>
              </div>
            </div>
            <div className="dashboard-program-detail-meta">
              <span>⏱ {program.duration}</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{program.salary}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              Progress: {completedCount} of {program.courses.length} courses complete
            </p>
            <div
              style={{
                height: '6px',
                background: 'var(--surface-container-highest)',
                borderRadius: '3px',
                marginBottom: '1.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${program.courses.length > 0 ? (completedCount / program.courses.length) * 100 : 0}%`,
                  background: program.categoryColor,
                  borderRadius: '3px',
                }}
              />
            </div>
            <h3 className="portal-section-heading" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              Course list
            </h3>
            <ul className="dashboard-program-course-list">
              {program.courses.map((c) => {
                const done = completedSet.has(c.slug);
                const isNext = !done && c.slug === nextCourseSlug;
                const isLocked = !done && !isNext;
                return (
                  <li
                    key={c.slug}
                    className={done ? 'is-done' : isNext ? 'is-next' : isLocked ? 'is-locked' : ''}
                  >
                    <span className="dashboard-program-course-name">
                      {done ? (
                        <span className="dashboard-program-course-check material-symbols-outlined" aria-hidden>
                          check_circle
                        </span>
                      ) : null}
                      {isLocked ? (
                        <span className="dashboard-program-course-lock material-symbols-outlined" aria-hidden>
                          lock
                        </span>
                      ) : null}
                      <span className={done ? 'dashboard-program-course-title--done' : undefined}>{c.name}</span>
                      {isNext ? <span className="dashboard-program-up-next">Up next</span> : null}
                    </span>
                    <span className={`dashboard-program-badge ${done ? 'complete' : isNext ? 'next' : 'pending'}`}>
                      {done ? 'Complete' : isNext ? 'Current' : 'Locked'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary">
                Go to Training
              </Link>
              <ProgramChangeRequestModal
                currentProgram={program}
                programs={otherPrograms}
                hasPendingRequest={!!pendingRequest}
              />
            </div>
          </div>
        </PortalCard>

      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
