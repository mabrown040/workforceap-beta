import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import ProgramPicker from '@/components/portal/ProgramPicker';
import { ProgramIcon } from '@/components/ProgramIcon';
import MobileBottomNav from '@/components/MobileBottomNav';
import ProgramChangeRequestPanel from '@/components/portal/ProgramChangeRequestPanel';
import PageHeader from '@/components/portal/PageHeader';
import PortalCard from '@/components/portal/ui/PortalCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Program',
  description: 'View or select your enrolled program.',
  path: '/dashboard/program',
});

export default async function ProgramPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/program');

  const activeViews = await getActivePrograms();
  let pickerPrograms = activeViews
    .map((v) => v.static)
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (pickerPrograms.length === 0) pickerPrograms = PROGRAMS;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, enrolledAt: true, coursesCompleted: true },
  });

  const enrolledSlug = dbUser?.enrolledProgram ?? null;
  const program = enrolledSlug ? getProgramBySlug(enrolledSlug) : null;
  const coursesCompleted = parseCourseSlugList(dbUser?.coursesCompleted);

  if (!enrolledSlug || !program) {
    return (
      <>
        <div className="portal-pad-x" style={{ paddingBottom: '6rem' }}>
          <PageHeader
            title="Choose your program"
            subtitle="Select one program. This is a one-time choice — funding is tied to a single program enrollment."
            breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'My Program' }]}
          />
          <ProgramPicker programs={pickerPrograms.length ? pickerPrograms : []} />
        </div>
        <MobileBottomNav variant="portal" />
      </>
    );
  }

  const completedSet = new Set(coursesCompleted);
  const completedCount = program.courses.filter((c) => completedSet.has(c.slug)).length;
  const nextCourseSlug =
    program.courses.find((c) => !completedSet.has(c.slug))?.slug ?? null;

  return (
    <>
      <div className="portal-pad-x" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="My Program"
          subtitle={dbUser?.enrolledAt ? `Enrolled ${dbUser.enrolledAt.toLocaleDateString()}` : undefined}
          breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'My Program' }]}
        />

        <PortalCard>
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
            <Link href="/dashboard/training" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Go to Training
            </Link>
          </div>
        </PortalCard>

        <ProgramChangeRequestPanel
          currentSlug={enrolledSlug}
          alternatives={pickerPrograms.length ? pickerPrograms : PROGRAMS}
        />
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
