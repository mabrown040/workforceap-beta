import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import Link from 'next/link';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import MobileBottomNav from '@/components/MobileBottomNav';

type Props = { params: Promise<{ memberId: string }> };

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function CounselorStudentDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/students');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const { memberId } = await params;

  const [counselor, adminUser] = await Promise.all([
    prisma.counselor.findFirst({
      where: { userId: user.id, active: true },
    }),
    isAdmin(user.id),
  ]);
  if (!counselor && !adminUser) redirect('/dashboard');

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { id: true, fullName: true, email: true, enrolledProgram: true, programInterest: true },
  });
  if (!member) notFound();

  if (counselor) {
    const assign = await prisma.counselorAssignment.findFirst({
      where: { counselorId: counselor.id, memberId, active: true },
    });
    if (!assign) notFound();
  } else if (!adminUser) {
    notFound();
  }

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });
  const authorIds = [...new Set(messages.map((m) => m.authorId))];
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, fullName: true } })
      : [];
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  const initials = getInitials(member.fullName ?? 'U');
  const program = member.enrolledProgram ?? member.programInterest ?? '—';

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Back nav */}
        <div style={{ padding: '1rem 1rem 0' }}>
          <Link
            href="/counselor/students"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              arrow_back
            </span>
            All Students
          </Link>
        </div>

        {/* Student hero */}
        <div style={{ padding: '1rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '1rem',
              padding: '1.25rem',
              border: '1px solid #ebe7e7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '0.875rem',
                  background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem' }}>{initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="truncate"
                  style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}
                >
                  {member.fullName}
                </h1>
                <p
                  className="truncate"
                  style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}
                >
                  {program}
                </p>
                <span
                  style={{
                    padding: '0.125rem 0.625rem',
                    borderRadius: '9999px',
                    background: '#dcfce7',
                    color: '#166534',
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                  }}
                >
                  On Track
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button
                style={{
                  flex: 1,
                  padding: '0.625rem 0',
                  background: 'var(--surface-container)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  chat
                </span>
                Message
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '0.625rem 0',
                  background: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  event
                </span>
                Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Program Progress */}
        <div style={{ padding: '0 1rem 1rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid #ebe7e7',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: '0 0 1rem' }}>
              Program Progress
            </h3>
            {/* Overall progress bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                  Overall Completion
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>68%</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: 'var(--surface-container)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: '68%',
                    background: 'linear-gradient(90deg,#8c0f37,#ad2c4d)',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </div>
            {/* Module list */}
            {[
              { name: 'Module 1: Introduction', done: true },
              { name: 'Module 2: Core Skills', done: true },
              { name: 'Module 3: Applied Practice', done: false, inProgress: true },
              { name: 'Module 4: Capstone', done: false },
            ].map((mod) => (
              <div
                key={mod.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  padding: '0.375rem 0',
                  borderTop: '1px solid #f0edec',
                  opacity: mod.done || mod.inProgress ? 1 : 0.5,
                }}
              >
                <span style={{ color: 'var(--color-on-surface-variant)' }}>{mod.name}</span>
                {mod.done ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#166534' }}>
                    check_circle
                  </span>
                ) : mod.inProgress ? (
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      background: '#fef3c7',
                      color: 'var(--color-gold)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    In Progress
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>Not started</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Counselor Notes */}
        <div style={{ padding: '0 1rem 1rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid #ebe7e7',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: 0 }}>
                Counselor Notes
              </h3>
              <button
                style={{
                  padding: '0.25rem 0.625rem',
                  background: 'var(--surface-container)',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--color-on-surface)',
                }}
              >
                Add Note
              </button>
            </div>
            {/* Latest 2 notes (static placeholder — notes model not yet in schema) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ borderLeft: '3px solid #8c0f37', paddingLeft: '0.75rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                  Most recent · You
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface)', margin: 0 }}>
                  Student is progressing well. Recommended additional exercises for current module.
                </p>
              </div>
              <div style={{ borderLeft: '3px solid #debfc2', paddingLeft: '0.75rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
                  Previous · You
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface)', margin: 0 }}>
                  Completed initial intake session. Reviewed program goals and expectations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop ─────────────────────────────────────────── */}
      <div className="wa-hidden wa-md:wa-block">
        <div className="portal-main-content">
          <Link
            href="/counselor/students"
            style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
          >
            ← Back to students
          </Link>
          <PageHeader title={member.fullName} subtitle={member.email} />

          <section style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Messages</h2>
            <AdminMemberCounselorChatClient
              messagesApiBase={`/api/counselor/members/${member.id}/messages`}
              initial={{
                staffUserId: user.id,
                member: { id: member.id, fullName: member.fullName },
                thread: {
                  id: thread.id,
                  memberId: thread.memberId,
                  counselorUserId: thread.counselorUserId,
                  memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
                  counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
                },
                messages: messages.map((m) => ({
                  ...serializeMessage(m),
                  authorName: nameById.get(m.authorId) ?? 'User',
                })),
              }}
            />
          </section>

          {adminUser ? (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link href={`/admin/members/${member.id}`} className="btn btn-outline btn-sm">
                Open full member record (admin)
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <MobileBottomNav variant="portal" />
    </>
  );
}
