import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Employers',
  description: 'Manage employers.',
  path: '/admin/employers',
});

export default async function AdminEmployersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/employers');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const employers = await prisma.employer.findMany({
    orderBy: { companyName: 'asc' },
    include: {
      user: { select: { email: true, fullName: true } },
      _count: { select: { jobs: true } },
    },
  });

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Employers</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Employers with portal access. Create employer records by linking a user (e.g. from Members).
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>User</th>
              <th>Jobs</th>
            </tr>
          </thead>
          <tbody>
            {employers.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.companyName}</strong>
                </td>
                <td>
                  {e.contactName} · {e.contactEmail}
                </td>
                <td>
                  {e.user.fullName} · {e.user.email}
                </td>
                <td>{e._count.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employers.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>
          No employers yet. Use the API or add employer records via database/seed for users who need employer access.
        </p>
      )}
    </div>
  );
}
