import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import InterviewCoach from '@/components/portal/tools/InterviewCoach';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Interview Coach',
  description: 'Practice job interviews with an AI coach. Get real-time questions and feedback.',
  path: '/dashboard/ai-tools/interview-coach',
});

export default async function InterviewCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-coach');

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* ── Breadcrumb + Header ── */}
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
            Career Suite
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
            chevron_right
          </span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>AI Interview Coach</span>
        </nav>
        <h1
          style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}
        >
          AI Interview{' '}
          <span style={{ color: 'var(--color-accent)' }}>Coach</span>
        </h1>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-on-surface-variant)',
            margin: '0.25rem 0 0',
          }}
        >
          Practice live interviews with an AI interviewer. Choose your role, type, and start talking.
        </p>
      </div>

      {/* ── How It Works Banner ── */}
      <div
        style={{
          maxWidth: 1160,
          margin: '1.5rem auto 0',
          padding: '0 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
        }}
      >
        {[
          { icon: 'settings', step: '1', title: 'Configure', desc: 'Pick your target role and interview type' },
          { icon: 'forum', step: '2', title: 'Practice', desc: 'Answer 5–7 AI-generated questions in real time' },
          { icon: 'reviews', step: '3', title: 'Get Feedback', desc: 'Receive constructive performance feedback' },
        ].map((s) => (
          <div
            key={s.step}
            style={{
              background: 'var(--surface-container)',
              borderRadius: 10,
              padding: '1rem',
              border: '1px solid var(--surface-container-high)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1rem', color: 'var(--color-accent)' }}
              >
                {s.icon}
              </span>
            </div>
            <div>
              <div
                style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-on-surface)' }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Coach UI ── */}
      <div
        style={{
          maxWidth: 1160,
          margin: '1.75rem auto',
          padding: '0 1.5rem 3rem',
        }}
      >
        <InterviewCoach />
      </div>
    </div>
  );
}
