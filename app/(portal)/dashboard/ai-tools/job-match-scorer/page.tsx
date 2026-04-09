import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export const metadata = buildPageMetadata({
  title: 'Job Match Scorer',
  description: 'See how well your resume matches a job and get specific gaps to address.',
  path: '/dashboard/ai-tools/job-match-scorer',
});

export default async function JobMatchScorerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/job-match-scorer');

  return (
    <>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Job Match Scorer"
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Job Match Scorer' },
            ]}
          />
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }} aria-hidden="true">
                target
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Job Match Scorer
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                Paste a job description and your resume. Get a match score and specific gaps to address.
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div
            className="stitch-card"
            style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}
          >
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste a job description and your resume to get a match score, missing keywords, and specific gaps to address
              before applying.
            </p>
          </div>

          <div className="stitch-card" style={{ padding: '1.25rem', borderRadius: 16, marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--color-on-surface)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--color-accent)' }} aria-hidden>
                compare
              </span>
              Analysis
            </h2>
            <JobMatchScorerForm />
          </div>

          <ToolHistoryPanel userId={user.id} toolType="job_match_scorer" />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <div className="stitch-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }} aria-hidden>
                  science
                </span>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Methodology</h4>
              </div>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Keyword overlap, semantic similarity, and role-relevant weighting produce an actionable compatibility score.
              </p>
            </div>
            <div className="stitch-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }} aria-hidden>
                  shield
                </span>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Privacy</h4>
              </div>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Job text and resume content are processed for this session. Copy or export results before you leave the page
                if you need to keep them.
              </p>
            </div>
            <div className="stitch-card" style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--color-accent)' }} aria-hidden>
                  info
                </span>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Session</h4>
              </div>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Results reflect this run&apos;s inputs. Re-run after you update your resume or try a different posting.
              </p>
            </div>
          </div>
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
