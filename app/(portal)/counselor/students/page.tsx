import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

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

  return (
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
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{a.member.email}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
