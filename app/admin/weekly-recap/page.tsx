import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getWeeklyRecapCohortStats } from '@/lib/admin/cohortAnalytics';
import PageHeader from '@/components/portal/PageHeader';

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
    <>
      <PageHeader
        title="Weekly recap analytics"
        subtitle="Generated recaps and engagement by enrolled program (cohort)."
      />
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Desktop table */}
        <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
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
                <span>With recaps: <strong style={{ color: 'var(--color-on-surface)' }}>{r.membersWithRecap}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                <span>Total: <strong style={{ color: 'var(--color-on-surface)' }}>{r.totalRecaps}</strong></span>
                <span>7d: <strong style={{ color: 'var(--color-on-surface)' }}>{r.recapsLast7Days}</strong></span>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                Avg readiness: <strong style={{ color: 'var(--color-on-surface)' }}>{r.avgReadinessScore != null ? `${r.avgReadinessScore}%` : '—'}</strong>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
              No weekly recap data yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
