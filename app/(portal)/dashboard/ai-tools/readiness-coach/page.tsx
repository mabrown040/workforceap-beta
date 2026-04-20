import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
import CompactReadinessCoach from '@/components/portal/CompactReadinessCoach';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Readiness Coach',
  description: 'Talk through your career readiness plan with an AI coach — interviews, certifications, and next steps.',
  path: '/dashboard/ai-tools/readiness-coach',
});

export default async function ReadinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/readiness-coach');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1rem',
          }}
        >
          <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
            AI Tools
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Career Readiness Coach</span>
        </nav>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>AI Career Readiness Coach</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', maxWidth: 640 }}>
          Talk through interviews, certifications, and your next steps with a dedicated AI coach. Program context is included automatically.
        </p>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
        <CompactReadinessCoach />
      </div>

      <div className="wa-block wa-md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
