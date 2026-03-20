import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getCertificationsCohortStats } from '@/lib/admin/cohortAnalytics';

export const metadata: Metadata = buildPageMetadata({
  title: 'Certifications analytics',
  description: 'Member certifications by cohort.',
  path: '/admin/certifications',
});

export default async function AdminCertificationsAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/certifications');

  const adminRole = await prisma.userRole.findFirst({
    where: { userId: user.id },
    include: { role: true },
  });
  if (adminRole?.role?.name !== 'admin') {
    redirect('/dashboard');
  }

  const rows = await getCertificationsCohortStats();

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/admin" className="resource-back-link">
            ← Back to admin
          </Link>
          <h1>Certifications analytics</h1>
          <p>Recorded certifications by enrolled program (cohort).</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Members</th>
                  <th>Members with certs</th>
                  <th>Total certifications</th>
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
      </section>
    </div>
  );
}
