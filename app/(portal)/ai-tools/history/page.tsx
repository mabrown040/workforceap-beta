import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import AIHistoryList from '@/components/portal/AIHistoryList';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Tool History',
  description: 'View your past AI tool results.',
  path: '/ai-tools/history',
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

export default async function AIHistoryPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools/history');

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
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>My AI Results</h1>
            <p>Revisit your past resume rewrites, cover letters, interview questions, and headlines.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '800px' }}>
            {withLabels.length === 0 ? (
              <div className="resource-empty-state">
                <p>No results yet. Use an AI tool to get started.</p>
                <Link href="/ai-tools" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Go to AI Tools
                </Link>
              </div>
            ) : (
              <AIHistoryList results={withLabels} />
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
