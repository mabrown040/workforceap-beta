import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AIHistoryList from '@/components/portal/AIHistoryList';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Tool History',
  description: 'View your past AI tool results.',
  path: '/dashboard/ai-tools/history',
});

const TOOL_LABELS: Record<string, string> = {
  job_match_scorer: 'Job Match Scorer',
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  salary_negotiation: 'Salary Negotiation',
  gap_analyzer: 'Gap Analyzer',
};

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
    toolLabel: TOOL_LABELS[r.toolType] ?? r.toolType,
  }));

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>My AI Results</h1>
          <p>Revisit your past resume rewrites, cover letters, interview questions, and headlines.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '800px' }}>
            {withLabels.length === 0 ? (
              <div className="resource-empty-state">
                <p>No results yet. Use an AI tool to get started.</p>
                <Link href="/dashboard/ai-tools" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Go to AI Tools
                </Link>
              </div>
            ) : (
              <AIHistoryList results={withLabels} initialFilter={tool ?? ''} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
