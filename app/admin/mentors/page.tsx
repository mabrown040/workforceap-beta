import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import MentorStatusButtons from '@/components/admin/MentorStatusButtons';

export default async function AdminMentorsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/mentors');
  await requireAdmin(user.id);

  const mentors = await prisma.mentor.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      company: true,
      industry: true,
      isActive: true,
      approvedAt: true,
      createdAt: true,
    },
  });

  return (
    <main style={{ padding: '1.5rem', maxWidth: '90rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.35rem' }}>Mentor management</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', maxWidth: '48rem', lineHeight: 1.5 }}>
        Approve new mentor applications, or deactivate access. Approved mentors receive an email when{' '}
        <code style={{ fontSize: '0.85em' }}>RESEND_API_KEY</code> is configured.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '52rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '0.65rem 0.5rem' }}>Name</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Company</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Industry</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Status</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Applied Date</th>
              <th style={{ padding: '0.65rem 0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map((mentor) => (
              <tr key={mentor.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '0.7rem 0.5rem' }}>{mentor.fullName}</td>
                <td style={{ padding: '0.7rem 0.5rem' }}>{mentor.company}</td>
                <td style={{ padding: '0.7rem 0.5rem' }}>{mentor.industry}</td>
                <td style={{ padding: '0.7rem 0.5rem' }}>{mentor.approvedAt ? (mentor.isActive ? 'Approved' : 'Deactivated') : 'Pending'}</td>
                <td style={{ padding: '0.7rem 0.5rem' }}>{mentor.createdAt.toLocaleDateString()}</td>
                <td style={{ padding: '0.7rem 0.5rem' }}>
                  <MentorStatusButtons mentorId={mentor.id} approvedAt={mentor.approvedAt} isActive={mentor.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
