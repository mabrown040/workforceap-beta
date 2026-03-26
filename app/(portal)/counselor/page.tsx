import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { Users, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

async function isCounselor(userId: string): Promise<boolean> {
  const counselor = await prisma.counselor.findFirst({
    where: { userId, active: true },
    select: { id: true },
  });
  return !!counselor;
}

export default async function CounselorPortalPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const canAccess = await isCounselor(user.id);
  if (!canAccess) redirect('/dashboard');

  const [counselor, assignments, messagesNeedingReply, dbUser] = await Promise.all([
    prisma.counselor.findFirst({
      where: { userId: user.id, active: true },
      include: { partner: { select: { name: true } } },
    }),
    prisma.counselorAssignment.findMany({
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
    }),
    prisma.messageThread.count({
      where: {
        counselorUserId: user.id,
        messages: {
          some: {
            authorId: { not: user.id },
            createdAt: {
              gt: await prisma.messageThread.findFirst({
                where: { counselorUserId: user.id },
                select: { counselorLastReadAt: true },
              }).then((t) => t?.counselorLastReadAt || new Date(0)),
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    }),
  ]);

  if (!counselor || !dbUser) redirect('/dashboard');

  return (
    <div className="portal-main-content">
      <PageHeader
        title={`Welcome, ${dbUser.fullName}`}
        subtitle={`${counselor.partner.name} • ${assignments.length} active student${assignments.length === 1 ? '' : 's'}`}
      />

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(173, 44, 77, 0.1)' }}>
            <Users size={24} style={{ color: 'var(--color-accent)' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{assignments.length}</div>
            <div className="stat-card__label">Active Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(240, 205, 131, 0.2)' }}>
            <MessageSquare size={24} style={{ color: 'var(--color-gold)' }} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{messagesNeedingReply}</div>
            <div className="stat-card__label">Messages Needing Reply</div>
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
            <div className="stat-card__label">Enrolled in Programs</div>
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
            <div className="stat-card__label">Needs Attention</div>
          </div>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
          Your Students ({assignments.length})
        </h2>
        
        {assignments.length === 0 ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            background: 'var(--color-gray-50)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-gray-200)'
          }}>
            <p style={{ color: 'var(--color-gray-600)' }}>
              No students assigned yet. Students will appear here when assigned by an administrator.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {assignments.map((assignment) => (
              <a
                key={assignment.id}
                href={`/admin/members/${assignment.member.id}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {assignment.member.fullName}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                      {assignment.member.email}
                    </p>
                  </div>
                  {assignment.member.enrolledProgram ? (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(74, 155, 79, 0.1)',
                      color: '#4a9b4f',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      Enrolled
                    </span>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(234, 179, 8, 0.1)',
                      color: '#eab308',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      Not Enrolled
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: '0.9rem', color: 'var(--color-gray-700)' }}>
                  <strong>Program Interest:</strong> {assignment.member.programInterest || 'Not specified'}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
