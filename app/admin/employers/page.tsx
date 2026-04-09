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
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import AdminEmployerTierSelect from './AdminEmployerTierSelect';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Employers',
  description: 'Manage employers.',
  path: '/admin/employers',
});

export default async function AdminEmployersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/employers');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const [superAdmin, employers] = await Promise.all([
    isSuperAdmin(user.id),
    prisma.employer.findMany({
      orderBy: { companyName: 'asc' },
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { jobs: true } },
      },
    }),
  ]);

  return (
    <PortalPageFrame>
      <PageHeader title="Employers" subtitle="Employers with portal access. Create accounts below, or open a company's portal as a super-admin to help them post jobs." />

      {superAdmin && (
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ClearEmployerPortalContext />
          <span style={{ color: 'var(--color-on-surface-variant)' }}>
            Stops pinning the employer portal to a specific company (falls back to default).
          </span>
        </p>
      )}

      {employers.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>User</th>
                  <th>Jobs</th>
                  <th>Tier</th>
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
                    <td>
                      <AdminEmployerTierSelect employerId={e.id} initialTier={e.tier} />
                    </td>
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

          {/* Mobile cards */}
          <div className="wa-md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {employers.map((e) => (
              <div
                key={e.id}
                style={{
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.875rem 1rem',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{e.companyName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>
                  {e.contactName} · {e.contactEmail}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
                  {e.user.fullName} · {e.user.email}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    Jobs: <strong style={{ color: 'var(--color-on-surface)' }}>{e._count.jobs}</strong>
                  </span>
                  <AdminEmployerTierSelect employerId={e.id} initialTier={e.tier} />
                </div>
                {superAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <OpenEmployerPortalButton employerId={e.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {employers.length === 0 && (
        <p style={{ color: 'var(--color-on-surface-variant)', marginTop: '1rem' }}>
          No employers yet. Create the first account using the form below.
        </p>
      )}

      <CreateEmployerAccountClient />
    </PortalPageFrame>
  );
}
