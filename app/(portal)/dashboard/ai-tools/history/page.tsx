import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AIHistoryList from '@/components/portal/AIHistoryList';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Tool History',
  description: 'View your past AI tool results.',
  path: '/dashboard/ai-tools/history',
});

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
      if (parsed?.type === 'elevator_pitch') return 'AI Elevator Speech';
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

  const results = await prisma.aIToolResult.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const withLabels = results.map((r) => ({
    ...r,
    toolLabel: getHistoryToolLabel(r.toolType, r.output),
  }));

  return (
    <>
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
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">arrow_back</span>
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
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }} aria-hidden="true">history</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>My AI Results</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Revisit your past resume rewrites, cover letters, interview questions, and headlines.
            </p>
          </div>
        </div>
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
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>No results yet. Use an AI tool to get started.</p>
            <Link
              href="/dashboard/ai-tools"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '8px',
                background: 'var(--color-accent)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Go to AI Tools
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
            </Link>
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
