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

const HOT_QUEUE_LOOKBACK_DAYS = 7;

function formatHotQueueTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return `${diffDays}d ago`;
}

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
  const memberIds = assignments.map((a) => a.memberId);
  const hotQueueCutoff = new Date(Date.now() - HOT_QUEUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const hotQueue = memberIds.length
    ? await prisma.memberNextBestAction.findMany({
        where: {
          memberId: { in: memberIds },
          status: 'PENDING',
          icon: 'auto_awesome',
          createdAt: { gte: hotQueueCutoff },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          memberId: true,
          title: true,
          description: true,
          ctaLabel: true,
          ctaHref: true,
          createdAt: true,
          member: {
            select: {
              id: true,
              fullName: true,
              enrolledProgram: true,
              programInterest: true,
            },
          },
        },
      })
    : [];

  return (
    <PortalPageFrame>
      <PageHeader title="My members" subtitle="Members assigned to you for coaching and messaging." />
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
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
            { label: 'Active Members', value: activeCount, accent: 'var(--color-accent)' },
            { label: 'Enrolled', value: enrolledCount, accent: 'var(--color-gold)' },
            { label: 'Hot Queue', value: hotQueue.length, accent: 'var(--color-amber)' },
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

        {hotQueue.length > 0 ? (
          <div style={{ padding: '1rem 1rem 0' }}>
            <div
              style={{
                background: 'var(--color-amber-light)',
                border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                borderRadius: '1rem',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-amber)' }}>
                    Hot member queue
                  </p>
                  <h2 style={{ margin: '0.2rem 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-amber)' }}>
                    Fresh completions that need counselor follow-up
                  </h2>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-amber)', fontSize: 24 }} aria-hidden="true">local_fire_department</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {hotQueue.map((action) => (
                  <Link
                    key={action.id}
                    href={`/counselor/students/${action.memberId}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.9)',
                        borderRadius: '0.875rem',
                        border: '1px solid color-mix(in srgb, var(--color-amber) 15%, transparent)',
                        padding: '0.875rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                          {action.member.fullName ?? 'Member'}
                        </p>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)', whiteSpace: 'nowrap' }}>
                          {formatHotQueueTime(action.createdAt)}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-amber)' }}>{action.title}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

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
          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '20px' }} aria-hidden="true">
            sort
          </span>
        </div>

        {/* Student list */}
        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {assignments.length === 0 ? (
            <PortalEmptyState
              title="No members assigned yet"
              description="Members will appear here once assigned by an administrator."
              icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
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
                      <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: '18px' }} aria-hidden="true">
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
      <div className="wa-hidden md:wa-block">
        {hotQueue.length > 0 ? (
          <section style={{ marginBottom: '1.5rem' }}>
            <div
              className="portal-card portal-card--flat"
              style={{
                padding: '1.25rem',
                border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                background: 'linear-gradient(180deg, var(--color-amber-light) 0%, #ffffff 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.875rem' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-amber)' }}>
                    Hot member queue
                  </p>
                  <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-amber)' }}>
                    Members who just became actionable
                  </h2>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-amber)', fontSize: 28 }} aria-hidden="true">local_fire_department</span>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {hotQueue.map((action) => (
                  <Link
                    key={action.id}
                    href={`/counselor/students/${action.memberId}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '1rem',
                      alignItems: 'center',
                      textDecoration: 'none',
                      border: '1px solid color-mix(in srgb, var(--color-amber) 15%, transparent)',
                      borderRadius: '0.9rem',
                      padding: '0.9rem 1rem',
                      background: '#fff',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
                        {action.member.fullName ?? 'Member'}
                      </p>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-amber)' }}>{action.title}</p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>{action.description}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-amber)' }}>
                        {formatHotQueueTime(action.createdAt)}
                      </p>
                      <span className="btn btn-primary btn-sm">Open member</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {assignments.length === 0 ? (
          <PortalEmptyState
            title="No members assigned yet"
            description="Members will appear here once assigned by an administrator."
            icon={<span className="material-symbols-outlined" aria-hidden="true">person_search</span>}
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
