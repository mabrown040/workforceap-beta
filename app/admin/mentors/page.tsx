import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

async function updateMentorAction(formData: FormData) {
  'use server';

  const user = await getUser();
  if (!user) return;
  await requireAdmin(user.id);

  const mentorId = String(formData.get('mentorId') || '');
  const action = String(formData.get('action') || '');

  if (!mentorId) return;

  if (action === 'approve') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: true, approvedAt: new Date() } });
  }

  if (action === 'deactivate') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: false } });
  }

  if (action === 'activate') {
    await prisma.mentor.update({ where: { id: mentorId }, data: { isActive: true } });
  }
}

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
    <main style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>Mentor Management</h1>
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
                <td style={{ padding: '0.7rem 0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {!mentor.approvedAt ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="approve" />
                      <button type="submit" style={{ border: 0, borderRadius: '0.45rem', padding: '0.45rem 0.7rem', background: 'var(--color-accent)', color: '#fff', fontWeight: 600 }}>Approve</button>
                    </form>
                  ) : null}
                  {mentor.approvedAt && mentor.isActive ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="deactivate" />
                      <button type="submit" style={{ border: 0, borderRadius: '0.45rem', padding: '0.45rem 0.7rem', background: '#a91b3f', color: '#fff', fontWeight: 600 }}>Deactivate</button>
                    </form>
                  ) : null}
                  {mentor.approvedAt && !mentor.isActive ? (
                    <form action={updateMentorAction}>
                      <input type="hidden" name="mentorId" value={mentor.id} />
                      <input type="hidden" name="action" value="activate" />
                      <button type="submit" style={{ border: 0, borderRadius: '0.45rem', padding: '0.45rem 0.7rem', background: 'var(--color-accent)', color: '#fff', fontWeight: 600 }}>Activate</button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
