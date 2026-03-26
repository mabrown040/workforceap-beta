import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { Users, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { counselorAffiliationLabel } from '@/lib/counselor/counselorLabels';

export default async function CounselorPortalPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const allowed = (await isCounselor(user.id)) || (await isAdmin(user.id));
  if (!allowed) redirect('/dashboard');

  const counselor = await prisma.counselor.findFirst({
    where: { userId: user.id, active: true },
    include: { partner: { select: { name: true } } },
  });

  if (!counselor && !(await isAdmin(user.id))) redirect('/dashboard');

  const assignments = counselor
    ? await prisma.counselorAssignment.findMany({
        where: {
          counselor: { userId: user.id, active: true },
          active: true,
        },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              programInterest: true,
              enrolledProgram: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      })
    : [];

  let messagesNeedingReply = 0;
  if (counselor && assignments.length > 0) {
    const memberIds = assignments.map((a) => a.memberId);
    const threads = await prisma.messageThread.findMany({
      where: { memberId: { in: memberIds }, kind: 'member' },
      select: { id: true, memberId: true },
    });
    for (const t of threads) {
      if (!t.memberId) continue;
      const lastMsg = await prisma.message.findFirst({
        where: { threadId: t.id },
        orderBy: { createdAt: 'desc' },
        select: { authorId: true },
      });
      if (lastMsg?.authorId === t.memberId) messagesNeedingReply += 1;
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });
  if (!dbUser) redirect('/dashboard');

  const affiliation = counselor ? counselorAffiliationLabel(counselor.partner?.name) : 'WorkforceAP';

  return (
    <div className="portal-main-content">
      <PageHeader
        title={`Welcome, ${dbUser.fullName}`}
        subtitle={`${affiliation} · ${assignments.length} active student${assignments.length === 1 ? '' : 's'}`}
      />

      <div
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          marginBottom: '2rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(173, 44, 77, 0.1)' }}>
            <Users size={24} style={{ color: 'var(--color-accent)' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{assignments.length}</div>
            <div className="stat-card__label">Active students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(240, 205, 131, 0.2)' }}>
            <MessageSquare size={24} style={{ color: 'var(--color-gold)' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{messagesNeedingReply}</div>
            <div className="stat-card__label">Threads with new member messages</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(74, 155, 79, 0.1)' }}>
            <CheckCircle size={24} style={{ color: '#4a9b4f' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">
              {assignments.filter((a) => a.member.enrolledProgram).length}
            </div>
            <div className="stat-card__label">Enrolled in programs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
            <AlertCircle size={24} style={{ color: '#eab308' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">
              {assignments.filter((a) => !a.member.enrolledProgram && !a.member.programInterest).length}
            </div>
            <div className="stat-card__label">Needs attention</div>
          </div>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Your students ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-200)',
            }}
          >
            <p style={{ color: 'var(--color-gray-600)' }}>
              No students assigned yet. Administrators assign members to you from the admin workspace.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/counselor/students/${assignment.member.id}`}
                style={{
                  display: 'block',
                  padding: '1.25rem',
                  background: 'white',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                className="student-card-hover"
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {assignment.member.fullName}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                      {assignment.member.email}
                    </p>
                  </div>
                  {assignment.member.enrolledProgram ? (
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(74, 155, 79, 0.1)',
                        color: '#4a9b4f',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      Enrolled
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(234, 179, 8, 0.1)',
                        color: '#eab308',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      Not enrolled
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-700)' }}>
                  <strong>Program interest:</strong> {assignment.member.programInterest || 'Not specified'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
