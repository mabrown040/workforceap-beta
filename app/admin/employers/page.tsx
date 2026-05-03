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
import EmployerStatusButton from './EmployerStatusButton';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import AdminEmployerTierSelect from './AdminEmployerTierSelect';

function getPartnershipTier(placementAgreementSigned: boolean, hiringPipelineActive: boolean): {
  label: string;
  color: string;
  bg: string;
} {
  if (placementAgreementSigned && hiringPipelineActive) {
    return { label: 'Strategic Hiring Partner', color: '#7b1fa2', bg: 'rgba(123,31,162,0.10)' };
  }
  if (placementAgreementSigned) {
    return { label: 'Hiring Partner', color: '#1565c0', bg: 'rgba(21,101,192,0.10)' };
  }
  if (hiringPipelineActive) {
    return { label: 'Active Pipeline', color: '#2e7d32', bg: 'rgba(46,125,50,0.10)' };
  }
  return { label: 'Standard', color: 'var(--color-on-surface-variant)', bg: 'var(--surface-container)' };
}

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
      <PageHeader title="Employers" subtitle="Manage employer accounts. Only active employers can be opened in the employer portal preview; inactive rows stay here until reactivated." />

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
          <div className="wa-hidden md:wa-block employer-applications-shell" style={{ overflowX: 'auto' }}>
            <table className="admin-table employer-applications-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Portal User</th>
                  <th>Status</th>
                  <th>Jobs</th>
                  <th>Tier</th>
                  <th>Partnership</th>
                  <th>Actions</th>
                  {superAdmin && <th>Help</th>}
                </tr>
              </thead>
              <tbody>
                {employers.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                          {(e.companyName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <Link href={`/admin/employers/${e.id}`} style={{ color: 'var(--color-on-surface)', fontWeight: 700, textDecoration: 'none' }}>
                          {e.companyName}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{e.contactName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{e.contactEmail}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{e.user.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{e.user.email}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          background: e.status === 'active' ? 'rgba(74, 155, 79, 0.12)' : 'var(--surface-container)',
                          color: e.status === 'active' ? '#2d7a32' : 'var(--color-on-surface-variant)',
                          fontWeight: 600,
                        }}
                      >
                        {e.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{e._count.jobs}</span>
                    </td>
                    <td>
                      <AdminEmployerTierSelect employerId={e.id} initialTier={e.tier} />
                    </td>
                    <td>
                      {(() => {
                        const pt = getPartnershipTier(e.placementAgreementSigned, e.hiringPipelineActive);
                        return (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', background: pt.bg, color: pt.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {pt.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <EmployerStatusButton employerId={e.id} active={e.status === 'active'} />
                    </td>
                    {superAdmin && (
                      <td>
                        <OpenEmployerPortalButton
                          employerId={e.id}
                          canOpenPortal={e.status === 'active'}
                          disabledReason="Inactive employers cannot be opened in portal preview. Reactivate the employer first."
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {employers.map((e) => {
              const initials = (e.companyName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={e.id} className="portal-activity-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>{e.companyName}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.contactName} · {e.contactEmail}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span
                        className="admin-portal-card__badge"
                        style={{
                          background: e.status === 'active' ? 'rgba(74,155,79,0.12)' : 'var(--surface-container)',
                          color: e.status === 'active' ? '#2d7a32' : 'var(--color-on-surface-variant)',
                        }}
                      >
                        {e.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}>work</span>
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{e._count.jobs}</span>
                    </div>
                  </div>
                  {/* Partnership tier */}
                  {(() => {
                    const pt = getPartnershipTier(e.placementAgreementSigned, e.hiringPipelineActive);
                    return (
                      <div style={{ paddingTop: '0.375rem' }}>
                        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem', background: pt.bg, color: pt.color, fontWeight: 600 }}>
                          {pt.label}
                        </span>
                      </div>
                    );
                  })()}
                  {/* Meta + actions row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.user.fullName} · {e.user.email}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                      <AdminEmployerTierSelect employerId={e.id} initialTier={e.tier} />
                      <EmployerStatusButton employerId={e.id} active={e.status === 'active'} />
                      {superAdmin && (
                        <OpenEmployerPortalButton
                          employerId={e.id}
                          canOpenPortal={e.status === 'active'}
                          disabledReason="Inactive employers cannot be opened in portal preview. Reactivate the employer first."
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
