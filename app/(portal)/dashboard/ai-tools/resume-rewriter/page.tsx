import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeRewriterClient from './ResumeRewriterClient';
import MobileBottomNav from '@/components/MobileBottomNav';

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
      <div style={{ paddingBottom: '6rem' }}>
        {/* ── Breadcrumb + Heading (single mount — was duplicated mobile/desktop) ── */}
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
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden>
              chevron_right
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Resume Rewriter</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark, #8b1a3a))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: '#fff' }} aria-hidden>
                edit_note
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.4rem)', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Refine Your Professional Impact
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                AI-powered resume optimization that passes ATS and impresses recruiters.
              </p>
            </div>
          </div>
        </div>

        {/* ── Decorative controls (visual only — real options live in ResumeRewriterClient) ── */}
        <div
          style={{
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)' }} aria-hidden>
                record_voice_over
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                Voice &amp; Tone
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 999,
                  background: 'var(--surface-container-highest)',
                  padding: 3,
                  gap: 2,
                }}
              >
                {['Analytical', 'Leadership', 'Creative'].map((tone) => (
                  <span
                    key={tone}
                    style={{
                      fontSize: '0.73rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 999,
                      background: tone === 'Leadership' ? 'var(--color-accent)' : 'transparent',
                      color: tone === 'Leadership' ? '#fff' : 'var(--color-on-surface-variant)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 500,
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', color: 'var(--color-accent)' }} aria-hidden>
                check_box
              </span>
              ATS Optimized
            </label>

            <div style={{ flex: 1, minWidth: 8 }} />

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0.5rem 1.25rem',
                borderRadius: 999,
                background: 'linear-gradient(135deg, var(--color-accent), #d4607a)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(173,44,77,0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden>
                auto_fix_high
              </span>
              Optimize Bullets
            </span>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '1rem 1rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--color-on-surface-variant)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginRight: '0.25rem',
            }}
          >
            Output Tags:
          </span>
          {[
            { label: 'Quantifiable', color: '#2e7d32', icon: 'trending_up' },
            { label: 'Action Verb', color: '#1565c0', icon: 'bolt' },
            { label: 'Revenue Impact', color: '#e65100', icon: 'attach_money' },
          ].map((tag) => (
            <span
              key={tag.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: 6,
                background: `${tag.color}18`,
                color: tag.color,
                letterSpacing: '0.02em',
                border: `1px solid ${tag.color}30`,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }} aria-hidden>
                {tag.icon}
              </span>
              {tag.label}
            </span>
          ))}
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="stitch-card" style={{ padding: '1.25rem', borderRadius: 16, marginBottom: '1.25rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste your resume bullets. Our AI rewrites them with strong action verbs, quantifiable impact, and keyword
              density tuned for ATS and recruiters. Use voice or text mode inside the tool.
            </p>
          </div>

          <div
            className="stitch-card"
            style={{
              padding: '1.75rem',
              borderRadius: 16,
              marginBottom: '2rem',
            }}
          >
            <ResumeRewriterClient />
          </div>

          <div
            className="stitch-card resume-rewriter-knowledge-card"
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 280px) 1fr',
              background: 'var(--surface-container-low)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, var(--surface-container-highest) 0%, var(--surface-container-high) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 160,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--color-accent)', opacity: 0.4 }} aria-hidden>
                auto_stories
              </span>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }} aria-hidden>
                  school
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                  Understanding the Curator&apos;s Standard
                </h3>
              </div>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', margin: '0 0 0.75rem' }}>
                Our AI follows the WorkforceAP Curator&apos;s Standard — a methodology that balances ATS keyword density with
                authentic professional voice. Each bullet is evaluated for quantifiable impact, strong action verbs, and
                alignment with your target role&apos;s core competencies.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 4,
                    background: 'rgba(173,44,77,0.10)',
                    color: 'var(--color-accent)',
                  }}
                >
                  WorkforceAP Standard v2.0
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 4,
                    background: 'var(--surface-container-highest)',
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  Updated Q1 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>
      <style>{`
        @media (max-width: 640px) {
          .resume-rewriter-knowledge-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
