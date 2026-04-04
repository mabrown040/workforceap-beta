import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeStrengthForm from '@/components/portal/tools/ResumeStrengthForm';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Analysis',
  description: 'AI breakdown of your resume strength, structure, and quick wins — without a job description.',
  path: '/dashboard/ai-tools/resume-analysis',
});

export default async function ResumeAnalysisPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-analysis');

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← AI Tools
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--surface-container-highest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>
                analytics
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Resume Analysis
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Strengths, gaps, and quick wins — no job posting required.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <div
            className="stitch-card"
            style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}
          >
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste your resume for a standalone review: overall score, what is working, what to fix first, and
              easy upgrades. Use Job Match Scorer when you have a specific posting to compare against.
            </p>
          </div>

          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <ResumeStrengthForm />
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      <div className="wa-hidden wa-md:wa-block" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
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
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← Career Suite
          </Link>
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.75rem',
            }}
          >
            <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
              AI Tools
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
              chevron_right
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Resume Analysis</span>
          </nav>
          <h1 className="text-display-sm" style={{ margin: '0 0 0.35rem' }}>
            Resume Analysis
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, maxWidth: '560px' }}>
            Get an ATS-aware review of your resume: score, strengths, priority fixes, and quick wins. Your uploaded resume
            pre-fills when available.
          </p>
        </div>

        <div style={{ padding: '2rem', maxWidth: '960px' }}>
          <ResumeStrengthForm />
        </div>
      </div>
    </>
  );
}
