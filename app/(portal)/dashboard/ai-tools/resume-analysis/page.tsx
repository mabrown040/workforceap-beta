import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeStrengthForm from '@/components/portal/tools/ResumeStrengthForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

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
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <PageHeader
            title="Resume Analysis"
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Resume Analysis' },
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>
                analytics
              </span>
            </div>
            <div>
              <h1 className="text-display-sm" style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>
                Resume Analysis
              </h1>
              <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '0.85rem', maxWidth: '560px' }}>
                Get an ATS-aware review of your resume: score, strengths, priority fixes, and quick wins. Your uploaded resume
                pre-fills when available.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1rem 2rem', maxWidth: 960, margin: '0 auto' }}>
          <div
            className="portal-card portal-card--flat"
            style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}
          >
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste your resume for a standalone review: overall score, what is working, what to fix first, and
              easy upgrades. Use Job Match Scorer when you have a specific posting to compare against.
            </p>
          </div>

          <ResumeStrengthForm />

          <ToolHistoryPanel userId={user.id} toolType="resume_analysis" />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
