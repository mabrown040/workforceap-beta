import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getWeeklyRecapCohortStats } from '@/lib/admin/cohortAnalytics';

export const metadata: Metadata = buildPageMetadata({
  title: 'Weekly recap analytics',
  description: 'Weekly recap engagement by cohort.',
  path: '/admin/weekly-recap',
});

export default async function AdminWeeklyRecapAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/weekly-recap');

  const rows = await getWeeklyRecapCohortStats();

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/admin" className="resource-back-link">
            ← Back to admin
          </Link>
          <h1>Weekly recap analytics</h1>
          <p>Generated recaps and engagement by enrolled program (cohort).</p>
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
                  <th>With recaps</th>
                  <th>Total recaps</th>
                  <th>Recaps (7d)</th>
                  <th>Avg readiness</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cohortKey}>
                    <td>{r.cohortLabel}</td>
                    <td>{r.memberCount}</td>
                    <td>{r.membersWithRecap}</td>
                    <td>{r.totalRecaps}</td>
                    <td>{r.recapsLast7Days}</td>
                    <td>{r.avgReadinessScore != null ? `${r.avgReadinessScore}%` : '—'}</td>
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
