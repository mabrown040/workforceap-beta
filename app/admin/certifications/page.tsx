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
        <div style={{ overflowX: 'auto' }}>
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
      </div>
    </>
  );
}
