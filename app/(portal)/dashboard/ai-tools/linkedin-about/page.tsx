import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import LinkedInAboutForm from '@/components/portal/tools/LinkedInAboutForm';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata = buildPageMetadata({
  title: 'LinkedIn About Section Generator',
  description: 'Create a polished LinkedIn About section from your role and resume or bullet points.',
  path: '/dashboard/ai-tools/linkedin-about',
});

export default async function LinkedInAboutPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-about');

  return (
    <>
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
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>person_pin</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>LinkedIn About Section Generator</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Add your target role and highlights. If you have a resume on file, we prefill from it and use the full text when generating your 3-paragraph About section.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="stitch-card" style={{ padding: '1.5rem' }}>
          <LinkedInAboutForm />
        </div>
        <ToolHistoryPanel userId={user.id} toolType="linkedin_about" />
      </div>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
