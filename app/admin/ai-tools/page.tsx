import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getAiToolsCohortStats } from '@/lib/admin/cohortAnalytics';
import PageHeader from '@/components/portal/PageHeader';

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
    <>
      <PageHeader
        title="AI tools analytics"
        subtitle="AI-powered tool runs by enrolled program (cohort)."
      />
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Desktop table */}
        <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
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
                <span>Using tools: <strong style={{ color: 'var(--color-on-surface)' }}>{r.membersUsedTools}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                <span>Total runs: <strong style={{ color: 'var(--color-on-surface)' }}>{r.totalRuns}</strong></span>
                <span>Runs (7d): <strong style={{ color: 'var(--color-on-surface)' }}>{r.runsLast7Days}</strong></span>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
              No AI tool usage data yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
