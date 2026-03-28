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

      <div className="counselor-stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--accent">
            <Users size={24} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{assignments.length}</div>
            <div className="stat-card__label">Active students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--gold">
            <MessageSquare size={24} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">{messagesNeedingReply}</div>
            <div className="stat-card__label">Threads with new member messages</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <CheckCircle size={24} aria-hidden />
          </div>
          <div>
            <div className="stat-card__value">
              {assignments.filter((a) => a.member.enrolledProgram).length}
            </div>
            <div className="stat-card__label">Enrolled in programs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--warning">
            <AlertCircle size={24} aria-hidden />
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
        <h2 className="counselor-section-heading">
          Your students ({assignments.length})
        </h2>

        {assignments.length === 0 ? (
          <div className="counselor-empty-state">
            <p>No students assigned yet. Administrators assign members to you from the admin workspace.</p>
          </div>
        ) : (
          <div className="counselor-students-list">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/counselor/students/${assignment.member.id}`}
                className="counselor-student-card"
              >
                <div className="counselor-student-card__header">
                  <div>
                    <h3 className="counselor-student-card__name">
                      {assignment.member.fullName}
                    </h3>
                    <p className="counselor-student-card__email">
                      {assignment.member.email}
                    </p>
                  </div>
                  {assignment.member.enrolledProgram ? (
                    <span className="badge badge-success badge-sm">Enrolled</span>
                  ) : (
                    <span className="badge badge-warning badge-sm">Not enrolled</span>
                  )}
                </div>

                <div className="counselor-student-card__program">
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
