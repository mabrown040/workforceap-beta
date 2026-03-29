import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';

export const metadata = buildPageMetadata({
  title: 'Job Match Scorer',
  description: 'See how well your resume matches a job and get specific gaps to address.',
  path: '/dashboard/ai-tools/job-match-scorer',
});

export default async function JobMatchScorerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/job-match-scorer');

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
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>target</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Job Match Scorer</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Paste a job description and your resume. Get a match score and specific gaps to address.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Score preview panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Score circle */}
          <div
            className="stitch-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ marginBottom: '1rem' }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--surface-container-highest)" strokeWidth="10" />
              <circle
                cx="70" cy="70" r="60"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 60 * 0.78} ${2 * Math.PI * 60 * 0.22}`}
                strokeDashoffset={2 * Math.PI * 60 * 0.25}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text x="70" y="65" textAnchor="middle" fill="var(--color-on-surface)" fontSize="28" fontWeight="700">78%</text>
              <text x="70" y="85" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="12">Match Score</text>
            </svg>
            <p className="text-label-upper" style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>Sample Score</p>
          </div>

          {/* Strategic insights */}
          <div className="stitch-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }}>insights</span>
              Strategic Insights
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <p className="text-label-upper" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>Missing Keywords</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['Agile', 'Scrum', 'CI/CD', 'AWS'].map((kw) => (
                  <span key={kw} style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(173,44,77,0.12)',
                    color: 'var(--color-accent)',
                    fontWeight: 500,
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-label-upper" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>Suggested Skills</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['Project Management', 'Data Analysis', 'Leadership'].map((skill) => (
                  <span key={skill} style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: 'var(--surface-container-highest)',
                    color: 'var(--color-on-surface-variant)',
                    fontWeight: 500,
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="stitch-card" style={{ padding: '1.5rem' }}>
          <JobMatchScorerForm />
        </div>
      </div>
    </div>
  );
}
