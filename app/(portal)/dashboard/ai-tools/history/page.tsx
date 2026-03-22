import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AIHistoryList from '@/components/portal/AIHistoryList';
import { getToolLabel } from '@/lib/ai/toolMeta';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Tool History',
  description: 'View your saved AI outputs and pick up where you left off.',
  path: '/dashboard/ai-tools/history',
});

type Props = { searchParams: Promise<{ tool?: string }> };

export default async function AIHistoryPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/history');

  const { tool } = await searchParams;
  const results = await prisma.aIToolResult.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  const withLabels = results.map((result) => ({ ...result, toolLabel: getToolLabel(result.toolType) }));

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>My AI Results</h1>
          <p>Everything you save across resume work, job fit checks, application tailoring, interview prep, and offer negotiation lives here.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '960px' }}>
            {withLabels.length === 0 ? (
              <div className="resource-empty-state">
                <p>No saved results yet. Start with resume rewriting or job match scoring to build a reusable workflow.</p>
                <Link href="/dashboard/ai-tools" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go to AI Tools</Link>
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
