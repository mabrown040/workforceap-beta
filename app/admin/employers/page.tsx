import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import CreateEmployerAccountClient from './CreateEmployerAccountClient';
import OpenEmployerPortalButton from './OpenEmployerPortalButton';
import ClearEmployerPortalContext from './ClearEmployerPortalContext';
import EmployerStatusButton from './EmployerStatusButton';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import EmployersTableClient from '@/components/admin/EmployersTableClient';
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

function statusBadgeStyle(status: string) {
  if (status === 'active') {
    return { background: 'rgba(74, 155, 79, 0.12)', color: '#2d7a32' };
  }
  if (status === 'pending_approval') {
    return { background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' };
  }
  return { background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' };
}

function statusLabel(status: string) {
  if (status === 'active') return 'Active';
  if (status === 'pending_approval') return 'Pending';
  return 'Inactive';
}

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin - Employers',
    description: 'Manage employers.',
    path: '/admin/employers',
  });
}

export default async function AdminEmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/employers');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { status: statusFilter } = await searchParams;
  const activeTab = statusFilter || 'all';

  const where = activeTab !== 'all' ? { status: activeTab } : {};

  const [superAdmin, employers, pendingCount] = await Promise.all([
    isSuperAdmin(user.id),
    prisma.employer.findMany({
      take: 5000,
      where,
      orderBy: { companyName: 'asc' },
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { jobs: true } },
      },
    }),
    prisma.employer.count({ where: { status: 'pending_approval' } }),
  ]);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  return (
    <PortalPageFrame>
      <PageHeader
        title="Employers"
        subtitle="Manage employer accounts. Only active employers can be opened in the employer portal preview; inactive rows stay here until reactivated."
        action={
          // /admin/employers is a Server Component — inline onClick handlers
          // are not allowed (passing an event handler from server to client
          // fails the route at render time). Use a plain anchor with
          // target="_blank" instead; functionally identical from the user's
          // perspective and survives SSR.
          <a
            href="/api/admin/employers/export"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            title="Export employers to CSV"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} /> Export CSV
          </a>
        }
      />

      {superAdmin && (
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ClearEmployerPortalContext />
          <span style={{ color: 'var(--color-on-surface-variant)' }}>
            Stops pinning the employer portal to a specific company (falls back to default).
          </span>
        </p>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.25rem' }}>
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/employers${tab.key === 'all' ? '' : `?status=${tab.key}`}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem 0.5rem 0 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              background: activeTab === tab.key ? 'var(--surface-container)' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {employers.length > 0 && (
        <>
          {/* Desktop table */}
          <EmployersTableClient employers={employers} superAdmin={superAdmin} />

          {/* Mobile cards */}
          <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {employers.map((e) => {
              const initials = (e.companyName ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const sStyle = statusBadgeStyle(e.status);
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
                        style={{ background: sStyle.background, color: sStyle.color }}
                      >
                        {statusLabel(e.status)}
                      </span>
                      <span className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue" style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}>work</span>
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{e._count.jobs}</span>
                    </div>
                  </div>
                  {/* Partnership tier row */}
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
                      <EmployerStatusButton employerId={e.id} status={e.status as 'active' | 'inactive' | 'pending_approval'} />
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
          {activeTab === 'pending_approval'
            ? 'No pending employers. Great!'
            : activeTab === 'active'
            ? 'No active employers yet.'
            : activeTab === 'inactive'
            ? 'No inactive employers.'
            : 'No employers yet. Create the first account using the form below.'}
        </p>
      )}

      <CreateEmployerAccountClient />
    </PortalPageFrame>
  );
}
