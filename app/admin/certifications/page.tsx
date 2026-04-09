import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCertificationsCohortStats } from '@/lib/admin/cohortAnalytics';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Certificates analytics',
  description: 'Member certificates by cohort.',
  path: '/admin/certifications',
});

export default async function AdminCertificationsAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/certifications');

  const rows = await getCertificationsCohortStats();

  return (
    <>
      <PageHeader
        title="Certificates analytics"
        subtitle="Recorded certificates by enrolled program (cohort)."
      />
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Desktop table */}
        <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Members</th>
                <th>Members with certs</th>
                <th>Total certificates</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohortKey}>
                  <td>{r.cohortLabel}</td>
                  <td>{r.memberCount}</td>
                  <td>{r.membersWithCert}</td>
                  <td>{r.totalCerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="wa-md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {rows.map((r) => (
            <div
              key={r.cohortKey}
              style={{
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{r.cohortLabel}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                <span>Members: <strong style={{ color: 'var(--color-on-surface)' }}>{r.memberCount}</strong></span>
                <span>With certs: <strong style={{ color: 'var(--color-on-surface)' }}>{r.membersWithCert}</strong></span>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                Total certificates: <strong style={{ color: 'var(--color-on-surface)' }}>{r.totalCerts}</strong>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
              No certificate data yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
