import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { counselorStudentStatusBadge, counselorStudentStatusBadgeVariant } from '@/lib/counselor/memberStatus';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function CounselorStudentsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/students');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: { counselor: { userId: user.id, active: true }, active: true },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
              programInterest: true,
              assessmentScorePct: true,
              coursesCompleted: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  const activeCount = assignments.length;
  const enrolledCount = assignments.filter((a) => a.member.enrolledProgram).length;

  return (
    <PortalPageFrame>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader title="My students" subtitle="Members assigned to you for coaching and messaging." />

        {/* Stats row */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '1rem 1rem 0',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { label: 'Active Students', value: activeCount, accent: 'var(--color-accent)' },
            { label: 'Enrolled', value: enrolledCount, accent: 'var(--color-gold)' },
            { label: 'Messages', value: 0, accent: 'var(--color-accent)' },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              style={{
                flexShrink: 0,
                background: 'var(--surface-container-low)',
                borderRadius: '0.75rem',
                padding: '0.875rem 1.125rem',
                minWidth: '110px',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 0.25rem',
                }}
              >
                {label}
              </p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: accent, margin: 0, lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TODO: Add real filter chips (At Risk, Upcoming Session) when
             student list is converted to a client component with filter state.
             Removed non-functional decorative chips that looked clickable. */}

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1rem 0.5rem',
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Active Roster</span>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '20px' }}>
            sort
          </span>
        </div>

        {/* Student list */}
        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {assignments.length === 0 ? (
            <PortalEmptyState
              title="No students assigned yet"
              description="Students will appear here once assigned by an administrator."
              icon={<span className="material-symbols-outlined">person_search</span>}
              primaryAction={{ label: 'Open Messages', href: '/counselor/messages' }}
              secondaryAction={{ label: 'Counselor guide', href: '/counselor/guide' }}
            />
          ) : (
            assignments.map((a) => {
              const initials = getInitials(a.member.fullName ?? 'U');
              const program = a.member.enrolledProgram ?? a.member.programInterest ?? '—';
              const enrolledSlug = a.member.enrolledProgram ?? null;
              const programMeta = enrolledSlug ? getProgramBySlug(enrolledSlug) : null;
              const completed = (a.member.coursesCompleted as string[] | null) ?? [];
              const completedSet = new Set(completed);
              const totalCourses = programMeta?.courses.length ?? 0;
              const completedCount =
                programMeta && totalCourses > 0
                  ? programMeta.courses.filter((c) => completedSet.has(c.slug)).length
                  : 0;
              const trainingProgressPct =
                programMeta && totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : null;
              const statusBadge = counselorStudentStatusBadge({
                enrolledProgram: a.member.enrolledProgram,
                assessmentScorePct: a.member.assessmentScorePct,
              });
              const statusVariant = counselorStudentStatusBadgeVariant({
                enrolledProgram: a.member.enrolledProgram,
                assessmentScorePct: a.member.assessmentScorePct,
              });
              return (
                <Link
                  key={a.id}
                  href={`/counselor/students/${a.member.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="portal-kpi-card active:scale-[0.98] wa-transition-all"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '0.625rem',
                        background: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>{initials}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="wa-truncate"
                        style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.9rem', margin: '0 0 0.125rem' }}
                      >
                        {a.member.fullName}
                      </p>
                      <p
                        className="wa-truncate"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--color-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          margin: '0 0 0.375rem',
                        }}
                      >
                        {program}
                      </p>
                      {trainingProgressPct === null ? (
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                          {enrolledSlug ? 'Training progress unavailable' : 'Not enrolled'}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              background: 'var(--surface-container)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${trainingProgressPct}%`,
                                background: 'var(--color-accent)',
                                borderRadius: '9999px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
                            {trainingProgressPct}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status + chevron */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                      <StatusBadge label={statusBadge.label} variant={statusVariant} />
                      <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: '18px' }}>
                        chevron_right
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ── Desktop ─────────────────────────────────────────── */}
      <div className="wa-hidden wa-md:wa-block">
        <PageHeader title="My students" subtitle="Members assigned to you for coaching and messaging." />

        {assignments.length === 0 ? (
          <PortalEmptyState
            title="No students assigned yet"
            description="Students will appear here once assigned by an administrator."
            icon={<span className="material-symbols-outlined">person_search</span>}
            primaryAction={{ label: 'Open Messages', href: '/counselor/messages' }}
            secondaryAction={{ label: 'Counselor guide', href: '/counselor/guide' }}
          />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
            {assignments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/counselor/students/${a.member.id}`}
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', width: '100%', justifyContent: 'space-between' }}
                >
                  <span>{a.member.fullName}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                    {a.member.email}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MobileBottomNav variant="counselor" />
    </PortalPageFrame>
  );
}
