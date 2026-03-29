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

export default async function CounselorMessagesHubPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/messages');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
  });
  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: { counselorId: counselor.id, active: true },
        include: { member: { select: { id: true, fullName: true, email: true } } },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem 0.5rem' }}>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--color-on-surface)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Messages
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
            Conversations with your students
          </p>
        </div>

        {/* Conversation list */}
        <div style={{ padding: '0.75rem 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {assignments.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No assigned members yet.
            </p>
          ) : (
            assignments.map((a) => {
              const initials = getInitials(a.member.fullName ?? 'U');
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
                      borderRadius: '0.875rem',
                      padding: '0.875rem 1rem',
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
                        borderRadius: '9999px',
                        background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>{initials}</span>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="truncate"
                        style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.9rem', margin: '0 0 0.125rem' }}
                      >
                        {a.member.fullName}
                      </p>
                      <p
                        className="truncate"
                        style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }}
                      >
                        Tap to open conversation
                      </p>
                    </div>

                    {/* Chevron */}
                    <span className="material-symbols-outlined" style={{ color: 'var(--outline-variant)', fontSize: '18px', flexShrink: 0 }}>
                      chevron_right
                    </span>
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
          <PageHeader title="Messages" subtitle="Open a conversation with an assigned member." />

          {assignments.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>No assigned members yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {assignments.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/counselor/students/${a.member.id}`}
                    className="btn btn-outline"
                    style={{ display: 'block', textAlign: 'left' }}
                  >
                    <strong>{a.member.fullName}</strong>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        color: 'var(--color-on-surface-variant)',
                        fontWeight: 400,
                      }}
                    >
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
