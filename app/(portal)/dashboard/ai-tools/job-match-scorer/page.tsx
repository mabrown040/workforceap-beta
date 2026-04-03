import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata = buildPageMetadata({
  title: 'Job Match Scorer',
  description: 'See how well your resume matches a job and get specific gaps to address.',
  path: '/dashboard/ai-tools/job-match-scorer',
});

export default async function JobMatchScorerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/job-match-scorer');

  const circumference = 2 * Math.PI * 58;
  const scorePercent = 0.78;
  const dashLen = circumference * scorePercent;
  const gapLen = circumference * (1 - scorePercent);

  return (
    <>
      {/* ── Mobile section ── */}
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>target</span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Job Match Scorer
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                See how well your resume matches a job posting.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste a job description and your resume to get a match score, missing keywords, and specific
              gaps to address before applying.
            </p>
          </div>

          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <JobMatchScorerForm />
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>

      {/* ── Desktop section ── */}
      <div className="wa-hidden wa-md:wa-block" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
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
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Job Match Scorer</span>
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
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: '#fff' }}>target</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
              Job Match Scorer
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Paste a job description and your resume. Get a match score and specific gaps to address.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>

        {/* ── Score Overview Bento: 4-col ring + 8-col insights ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '4fr 8fr',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Score Ring Card */}
          <div
            className="stitch-card"
            style={{
              padding: '2rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-container-low)',
              borderRadius: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle radial glow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 40%, rgba(173,44,77,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <svg width="150" height="150" viewBox="0 0 150 150" style={{ marginBottom: '0.75rem', position: 'relative' }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" />
                  <stop offset="100%" stopColor="#d4607a" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx="75" cy="75" r="58"
                fill="none"
                stroke="var(--surface-container-highest)"
                strokeWidth="10"
              />
              {/* Score arc */}
              <circle
                cx="75" cy="75" r="58"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="10"
                strokeDasharray={`${dashLen} ${gapLen}`}
                strokeDashoffset={circumference * 0.25}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
              <text x="75" y="68" textAnchor="middle" fill="var(--color-on-surface)" fontSize="30" fontWeight="700">
                78%
              </text>
              <text x="75" y="88" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="11" fontWeight="500">
                Match Score
              </text>
            </svg>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.75rem',
                borderRadius: 999,
                background: 'rgba(173,44,77,0.12)',
                color: 'var(--color-accent)',
                letterSpacing: '0.03em',
              }}
            >
              High Potential
            </span>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.6rem 0 0', opacity: 0.7 }}>
              Sample Score
            </p>
          </div>

          {/* Insights Panel */}
          <div
            className="stitch-card"
            style={{
              padding: '1.5rem 1.75rem',
              borderRadius: 16,
              background: 'var(--surface-container-low)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', color: 'var(--color-accent)' }}>insights</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Strategic Insights
              </h3>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  background: 'var(--surface-container-highest)',
                  color: 'var(--color-on-surface-variant)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Gap Analysis
              </span>
            </div>

            {/* 2-col grid: Missing Keywords + Suggested Skills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Missing Keywords */}
              <div>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-on-surface-variant)',
                    margin: '0 0 0.6rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', verticalAlign: 'middle', marginRight: '0.3rem' }}>
                    label_off
                  </span>
                  Missing Keywords
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Agile', 'Scrum', 'CI/CD', 'AWS', 'Docker', 'Terraform'].map((kw) => (
                    <span
                      key={kw}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 6,
                        background: 'rgba(173,44,77,0.10)',
                        color: 'var(--color-accent)',
                        fontWeight: 500,
                        border: '1px solid rgba(173,44,77,0.18)',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Skills */}
              <div>
                <p
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-on-surface-variant)',
                    margin: '0 0 0.6rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', verticalAlign: 'middle', marginRight: '0.3rem' }}>
                    lightbulb
                  </span>
                  Suggested Skills
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', listStyle: 'none' }}>
                  {['Project Management', 'Data Analysis', 'Leadership', 'Cloud Architecture', 'Stakeholder Comms'].map((skill) => (
                    <li
                      key={skill}
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-on-surface)',
                        padding: '0.2rem 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ── Analysis Tool Dual Pane ── */}
        <div
          className="stitch-card"
          style={{
            padding: '1.75rem',
            borderRadius: 16,
            marginBottom: '2.5rem',
            position: 'relative',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--color-on-surface)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--color-accent)' }}>
              compare
            </span>
            Analysis Tool
          </h2>

          {/* The form component handles all textareas, submit, API calls, output */}
          <JobMatchScorerForm />
        </div>

        {/* ── Footer: 3-col editorial ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Methodology */}
          <div
            className="stitch-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 14,
              background: 'var(--surface-container-low)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>science</span>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Methodology</h4>
            </div>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Our scoring engine uses NLP keyword extraction, semantic similarity matching, and industry-specific weighting to produce an actionable compatibility score.
            </p>
          </div>

          {/* Privacy Protocol */}
          <div
            className="stitch-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 14,
              background: 'var(--surface-container-low)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>shield</span>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Privacy Protocol</h4>
            </div>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Your resume and job descriptions are processed in real time and never stored on our servers. All analysis happens within your encrypted session.
            </p>
          </div>

          {/* Session Info */}
          <div
            className="stitch-card"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: 14,
              background: 'var(--surface-container-low)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>info</span>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Session Info</h4>
            </div>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Results are available for the duration of your current session. Export or copy your analysis before navigating away.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
