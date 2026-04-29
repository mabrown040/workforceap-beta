import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getAdminMetrics } from '@/lib/admin/metrics';
import PageHeader from '@/components/portal/PageHeader';

const AdminAnalyticsCharts = dynamic(
  () => import('@/components/admin/AdminAnalyticsCharts'),
  { loading: () => (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div className="loading-spinner" style={{
        width: '40px', height: '40px',
        border: '3px solid var(--outline-variant)',
        borderTop: '3px solid var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 1rem'
      }} />
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>
        Loading charts…
      </p>
    </div>
  )}
);

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin analytics',
  description: 'Engagement and activity metrics.',
  path: '/admin/metrics',
});

export default async function AdminMetricsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/metrics');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const data = await getAdminMetrics();

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Platform engagement, enrollment, and placement outcomes."
      />

      {/* Summary metric strip */}
      <div className="portal-metric-strip" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Members', value: data.totalMembers, icon: 'groups', accent: 'accent' as const },
          { label: 'Weekly Active', value: data.weeklyActiveMembers, icon: 'trending_up', accent: 'green' as const },
          { label: 'Placements', value: data.placementStats.placed, icon: 'person_check', accent: 'blue' as const },
          { label: 'Placement Rate', value: `${data.placementStats.placementRate}%`, icon: 'analytics', accent: 'gold' as const },
          { label: 'Certificates', value: data.placementStats.certifications, icon: 'workspace_premium', accent: 'green' as const },
          { label: 'AI Tool Runs', value: data.aiToolRuns, icon: 'auto_awesome', accent: 'blue' as const },
        ].map(m => (
          <div key={m.label} className="portal-metric-card">
            <div className={`portal-metric-card__icon-wrap portal-metric-card__icon-wrap--${m.accent}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
            </div>
            <p className="portal-metric-card__value">{m.value}</p>
            <p className="portal-metric-card__label">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Career OS funnel */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>
          Career OS — Completion Response Loop
        </p>
        <div className="portal-metric-strip">
          {[
            { label: 'Completion Events', value: data.careerOsMetrics.completionEventsReceived, icon: 'school', accent: 'accent' as const },
            { label: 'Actions Created', value: data.careerOsMetrics.actionsCreated, icon: 'auto_awesome', accent: 'blue' as const },
            { label: 'Actions Pending', value: data.careerOsMetrics.actionsPending, icon: 'pending', accent: 'gold' as const },
            { label: 'CTA Click-Through', value: data.careerOsMetrics.actionsClicked, icon: 'task_alt', accent: 'green' as const },
            { label: 'Click-Through Rate', value: `${data.careerOsMetrics.followThroughRate}%`, icon: 'trending_up', accent: 'green' as const },
          ].map(m => (
            <div key={m.label} className="portal-metric-card">
              <div className={`portal-metric-card__icon-wrap portal-metric-card__icon-wrap--${m.accent}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
              </div>
              <p className="portal-metric-card__value">{m.value}</p>
              <p className="portal-metric-card__label">{m.label}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
          Tracks Career OS learning-completion events, the follow-up actions created from them, and whether members clicked those action CTAs.
        </p>
      </div>

      {/* Charts */}
      <AdminAnalyticsCharts
        dailyActivity={data.dailyActivity}
        enrollmentByProgram={data.enrollmentByProgram}
        placementStats={data.placementStats}
        inactive14Days={data.inactive14Days}
        applicationsSubmitted={data.applicationsSubmitted}
        resourcesCompleted={data.resourcesCompleted}
        aiToolStats={data.aiToolStats}
      />

      <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
        <Link href="/admin/members" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>View all members</Link>
        {' · '}
        <Link href="/admin/exports" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Export data</Link>
      </p>
    </div>
  );
}
