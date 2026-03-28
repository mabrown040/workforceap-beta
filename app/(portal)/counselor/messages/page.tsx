import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

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
    <div className="portal-main-content">
      <PageHeader title="Messages" subtitle="Open a conversation with an assigned member." />

      {assignments.length === 0 ? (
        <p className="counselor-empty-state">No assigned members yet.</p>
      ) : (
        <ul className="counselor-member-list counselor-member-list--wide">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/counselor/students/${a.member.id}`}
                className="btn btn-outline counselor-member-list-btn--block"
              >
                <strong>{a.member.fullName}</strong>
                <span className="counselor-member-sub">{a.member.email}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
