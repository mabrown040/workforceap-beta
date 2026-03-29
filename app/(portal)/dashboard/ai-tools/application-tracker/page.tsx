import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ApplicationTrackerTable from '@/components/portal/ApplicationTrackerTable';
import MemberJobPostingTransparency from '@/components/portal/MemberJobPostingTransparency';

export const metadata = buildPageMetadata({
  title: 'Application Tracker',
  description: 'Track your job applications and interview progress.',
  path: '/dashboard/ai-tools/application-tracker',
});

export default async function ApplicationTrackerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/application-tracker');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <Link
          href="/dashboard/ai-tools"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.85rem',
            color: 'var(--color-on-surface-variant)',
            textDecoration: 'none',
            marginBottom: '0.75rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
          Back to AI Tools
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--surface-container-highest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>view_list</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Application Tracker</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                Track your job applications. Add applications, update status, and see your progress.
              </p>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                background: 'rgba(173,44,77,0.15)',
                color: 'var(--color-accent)',
                whiteSpace: 'nowrap',
              }}
            >
              Live Tracking
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="stitch-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <MemberJobPostingTransparency userId={user.id} />
        </div>
        <div className="stitch-card" style={{ padding: '1.5rem' }}>
          <ApplicationTrackerTable />
        </div>
      </div>
    </div>
  );
}
