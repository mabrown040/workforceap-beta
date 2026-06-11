import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getWeeklyRecapCohortStats } from '@/lib/admin/cohortAnalytics';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Weekly recap analytics',
    description: 'Weekly recap engagement by cohort.',
    path: '/admin/weekly-recap',
  });
}

export default async function AdminWeeklyRecapAnalyticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/weekly-recap');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const rows = await getWeeklyRecapCohortStats();

  return (
    <>
      <PageHeader
        title="Weekly recap analytics"
        subtitle="Generated recaps and engagement by enrolled program (cohort)."
      />
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Desktop table */}
        <div className="wa-hidden md:wa-block" style={{ overflowX: 'auto' }}>
          <DataTable
            variant="admin"
            tableClassName="admin-table"
            scrollX={false}
            rows={rows}
            rowKey={(r) => r.cohortKey}
            columns={[
              { key: 'cohort', header: 'Cohort', cell: (r) => r.cohortLabel },
              { key: 'members', header: 'Members', cell: (r) => r.memberCount },
              { key: 'withRecaps', header: 'With recaps', cell: (r) => r.membersWithRecap },
              { key: 'total', header: 'Total recaps', cell: (r) => r.totalRecaps },
              { key: '7d', header: 'Recaps (7d)', cell: (r) => r.recapsLast7Days },
              {
                key: 'readiness',
                header: 'Avg readiness',
                cell: (r) => (r.avgReadinessScore != null ? `${r.avgReadinessScore}%` : '—'),
              },
            ]}
          />
        </div>

        {/* Mobile cards */}
        <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
                <span>
                  Members: <strong style={{ color: 'var(--color-on-surface)' }}>{r.memberCount}</strong>
                </span>
                <span>
                  With recaps: <strong style={{ color: 'var(--color-on-surface)' }}>{r.membersWithRecap}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                <span>
                  Total: <strong style={{ color: 'var(--color-on-surface)' }}>{r.totalRecaps}</strong>
                </span>
                <span>
                  7d: <strong style={{ color: 'var(--color-on-surface)' }}>{r.recapsLast7Days}</strong>
                </span>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                Avg readiness:{' '}
                <strong style={{ color: 'var(--color-on-surface)' }}>
                  {r.avgReadinessScore != null ? `${r.avgReadinessScore}%` : '—'}
                </strong>
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
