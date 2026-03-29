import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Rewriter',
  description: 'AI-powered resume improvement tailored to your target job.',
  path: '/dashboard/ai-tools/resume-rewriter',
});

export default async function ResumeRewriterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-rewriter');

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
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>edit_note</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Resume Rewriter</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Paste your resume and target job. Get AI-improved bullets and phrasing to pass ATS and impress recruiters.
            </p>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div
        style={{
          padding: '1rem 2rem',
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)' }}>record_voice_over</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Voice Tone:</span>
          {['Analytical', 'Leadership', 'Creative'].map((tone) => (
            <span
              key={tone}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: tone === 'Leadership' ? 'var(--color-accent)' : 'var(--surface-container-high)',
                color: tone === 'Leadership' ? '#fff' : 'var(--color-on-surface-variant)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {tone}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>verified</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>ATS Optimized</span>
        </div>
      </div>

      {/* Output tags legend */}
      <div
        style={{
          padding: '0 2rem 1rem',
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Quantifiable', color: '#2e7d32' },
          { label: 'Action Verb', color: '#1565c0' },
          { label: 'Revenue Impact', color: '#e65100' },
        ].map((tag) => (
          <span
            key={tag.label}
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              background: `${tag.color}20`,
              color: tag.color,
              letterSpacing: '0.02em',
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Main form area */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        <div className="stitch-card" style={{ padding: '1.5rem' }}>
          <ResumeRewriterForm />
        </div>
      </div>
    </div>
  );
}
