import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import ResumeCoachWorkspace from '@/components/portal/ResumeCoachWorkspace';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Coach',
  description: 'Practice your story out loud and refine your resume in a dedicated voice coaching flow.',
  path: '/dashboard/ai-tools/resume-coach',
});

export default async function ResumeCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-coach');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Resume Coach"
            subtitle="Work through your background out loud, keep your live draft synced as you go, and review suggested rewrites during or after the session."
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Resume Coach' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div
            className="portal-card portal-card--flat"
            style={{
              padding: '1rem 1.1rem',
              borderRadius: 16,
              marginBottom: '1rem',
              background: 'var(--surface-container-low)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {[
                'Talk through accomplishments naturally',
                'Review coach suggestions before applying them to your draft',
                'Keep your saved resume aligned with the live voice session',
              ].map((item) => (
                <div key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-on-surface-variant)', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden>
                    check_circle
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <ResumeCoachWorkspace />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
