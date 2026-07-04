import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AIHistoryList from '@/components/portal/AIHistoryList';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('historyMetaTitle'),
    description: t('historyMetaDesc'),
    path: '/dashboard/ai-tools/history',
  });
}

const TOOL_LABELS: Record<string, string> = {
  job_match_scorer: 'Job Match Scorer',
  resume_analysis: 'Resume Analysis',
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  salary_negotiation: 'Salary Negotiation',
  gap_analyzer: 'Gap Analyzer',
  interview_coach: 'AI Interview Coach',
  voice_interview_video: 'Mock Interview Video',
  career_counselor: 'Career Counselor',
  skill_assessment: 'Skill Mapper / Skill Assessment',
};

function getHistoryToolLabel(toolType: string, output: string): string {
  if (toolType === 'career_counselor') {
    try {
      const parsed = JSON.parse(output) as { type?: string };
      if (parsed?.type === 'elevator_pitch') return 'AI Elevator Introduction';
    } catch {
      // ignore
    }
  }
  return TOOL_LABELS[toolType] ?? toolType;
}

type Props = { searchParams: Promise<{ tool?: string }> };

export default async function AIHistoryPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/history');

  const { tool } = await searchParams;

  let results: Awaited<ReturnType<typeof prisma.aIToolResult.findMany>> = [];
  try {
    results = await prisma.aIToolResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch {
    // Non-fatal — renders empty state
  }

  const withLabels = results.map((r) => ({
    ...r,
    toolLabel: getHistoryToolLabel(r.toolType, r.output),
  }));

  return (
    <>
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 2rem 1.5rem',
          borderBottom: '1px solid var(--surface-container-high)',
          background: 'var(--surface-container-low)',
        }}
      >
        <PageHeader
          title="My AI results"
          subtitle="Revisit your past resume rewrites, cover letters, interview questions, voice coach sessions, and headlines."
          breadcrumbs={[
            { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
            { label: 'History' },
          ]}
        />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {withLabels.length === 0 ? (
          <div
            className="portal-card portal-card--flat"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', display: 'block' }} aria-hidden="true">
              folder_open
            </span>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: '0 0 0.375rem' }}>No saved results yet</p>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              Start with the Resume Rewriter or Interview Practice — your outputs save here automatically.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/dashboard/ai-tools/resume-studio?view=rewrite"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1.125rem', fontSize: '0.8125rem', fontWeight: 600,
                  borderRadius: '8px', background: 'var(--color-accent)', color: '#ffffff', textDecoration: 'none',
                }}
              >
                Resume Rewriter
              </Link>
              <Link
                href="/dashboard/ai-tools/interview-practice"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1.125rem', fontSize: '0.8125rem', fontWeight: 600,
                  borderRadius: '8px', background: 'var(--surface-container-high)', color: 'var(--color-on-surface)', textDecoration: 'none',
                }}
              >
                Interview Practice
              </Link>
            </div>
          </div>
        ) : (
          <AIHistoryList results={withLabels} initialFilter={tool ?? ''} />
        )}
      </div>
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
