import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import InterviewCoach from '@/components/portal/tools/InterviewCoach';
import { getUser } from '@/lib/auth/server';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Interview Coach',
  description: 'Run a text-based mock interview and get instant AI feedback.',
  path: '/dashboard/ai-tools/interview-coach',
});

export default async function InterviewCoachPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
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
          <Link
            href="/dashboard/ai-tools"
            style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            AI Tools
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
            chevron_right
          </span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>AI Interview Coach</span>
        </nav>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
          AI Interview Coach
        </h1>
      </div>

      <div style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <InterviewCoach />
        </div>
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
