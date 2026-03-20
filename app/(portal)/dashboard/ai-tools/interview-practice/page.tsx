import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';

export const metadata: Metadata = buildPageMetadata({
  title: 'Interview Practice Generator',
  description: 'Generate role-specific interview questions with answer frameworks.',
  path: '/dashboard/ai-tools/interview-practice',
});

export default async function InterviewPracticePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-practice');

  const savedResults = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_practice' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, inputSummary: true, output: true, createdAt: true },
  });

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
            <Link href="/dashboard/ai-tools" className="resource-back-link">
              ← Back to AI Tools
            </Link>
            <h1>Interview Practice Generator</h1>
            <p>Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <InterviewPracticeForm />
            <InterviewPracticeSaved results={savedResults} />
          </div>
        </div>
      </section>

    </div>
  );
}
