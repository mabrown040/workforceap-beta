import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getAiToolsCohortStats } from '@/lib/admin/cohortAnalytics';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI tools analytics',
  description: 'AI tool usage by cohort.',
  path: '/admin/ai-tools',
});

export default async function AdminAiToolsAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/ai-tools');

  const rows = await getAiToolsCohortStats();

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/admin" className="resource-back-link">
            ← Back to admin
          </Link>
          <h1>AI tools analytics</h1>
          <p>AI-powered tool runs by enrolled program (cohort).</p>
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
                  <th>Members using tools</th>
                  <th>Total runs</th>
                  <th>Runs (7d)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.cohortKey}>
                    <td>{r.cohortLabel}</td>
                    <td>{r.memberCount}</td>
                    <td>{r.membersUsedTools}</td>
                    <td>{r.totalRuns}</td>
                    <td>{r.runsLast7Days}</td>
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
