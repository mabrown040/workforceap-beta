import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeStrengthForm from '@/components/portal/tools/ResumeStrengthForm';
import PageHeader from '@/components/portal/PageHeader';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Resume Analysis',
  description: 'Breakdown of your resume strength, structure, and quick wins — without a job description.',
  path: '/dashboard/ai-tools/resume-analysis',
});
}

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
            subtitle="Get an ATS-aware review of your resume: score, strengths, priority fixes, and quick wins. Your uploaded resume pre-fills when available."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Resume Analysis' },
            ]}
          />
        </div>

        <div style={{ padding: '1rem 1rem 2rem', maxWidth: 960, margin: '0 auto' }}>
          <div
            className="portal-card portal-card--flat"
            style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}
          >
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Paste your resume for a standalone review: overall score, what is working, what to fix first, and
              easy upgrades. Analysis is reviewed against hiring patterns common to ATS (Applicant Tracking Systems) — the software
              most employers use to screen resumes before a human ever reads them. Use Job Match Scorer when you have
              a specific posting to compare against.
            </p>
          </div>

          <ResumeStrengthForm />

          <ToolHistoryPanel userId={user.id} toolType="resume_analysis" />
        </div>      </div>
    </>
  );
}
