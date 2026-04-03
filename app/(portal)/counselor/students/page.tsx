import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

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
            select: { id: true, fullName: true, email: true, enrolledProgram: true, programInterest: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  const activeCount = assignments.length;
  const enrolledCount = assignments.filter((a) => a.member.enrolledProgram).length;

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
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

        {/* Filter chips */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '0.625rem',
            padding: '1rem 1rem 0',
            scrollbarWidth: 'none',
          }}
        >
          {['All', 'At Risk', 'Upcoming Session'].map((chip, i) => (
            <button
              key={chip}
              style={{
                flexShrink: 0,
                padding: '0.375rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                background: i === 0 ? 'var(--color-accent)' : 'var(--outline-variant)',
                color: i === 0 ? '#fff' : 'var(--color-on-surface)',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

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
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>No assigned students yet.</p>
          ) : (
            assignments.map((a) => {
              const initials = getInitials(a.member.fullName ?? 'U');
              const program = a.member.enrolledProgram ?? a.member.programInterest ?? '—';
              return (
                <Link
                  key={a.id}
                  href={`/counselor/students/${a.member.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="active:scale-[0.98] transition-all"
                    style={{
                      background: '#fff',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      border: '1px solid #ebe7e7',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '0.625rem',
                        background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))',
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
                        className="truncate"
                        style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.9rem', margin: '0 0 0.125rem' }}
                      >
                        {a.member.fullName}
                      </p>
                      <p
                        className="truncate"
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
                      {/* Progress bar placeholder */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
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
                              width: a.member.enrolledProgram ? '50%' : '10%',
                              background: 'var(--color-accent)',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status + chevron */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                      <span
                        style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          background: '#dcfce7',
                          color: '#166534',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        On Track
                      </span>
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
        <div className="portal-main-content">
          <PageHeader title="My students" subtitle="Members assigned to you for coaching and messaging." />

          {assignments.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No assigned students yet.</p>
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
      </div>

      <MobileBottomNav variant="counselor" />
    </>
  );
}
