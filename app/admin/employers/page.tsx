import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import CreateEmployerAccountClient from './CreateEmployerAccountClient';
import OpenEmployerPortalButton from './OpenEmployerPortalButton';
import ClearEmployerPortalContext from './ClearEmployerPortalContext';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Employers',
  description: 'Manage employers.',
  path: '/admin/employers',
});

export default async function AdminEmployersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/employers');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const superAdmin = await isSuperAdmin(user.id);

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
        Employers with portal access. Create accounts below, or open a company&apos;s portal as a super-admin to help
        them post jobs.
      </p>

      {superAdmin && (
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ClearEmployerPortalContext />
          <span style={{ color: 'var(--color-gray-500)' }}>
            Stops pinning the employer portal to a specific company (falls back to default).
          </span>
        </p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>User</th>
              <th>Jobs</th>
              {superAdmin && <th>Help</th>}
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
                {superAdmin && (
                  <td>
                    <OpenEmployerPortalButton employerId={e.id} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employers.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginTop: '1rem' }}>
          No employers yet. Create the first account using the form below.
        </p>
      )}

      <CreateEmployerAccountClient />
    </div>
  );
}
