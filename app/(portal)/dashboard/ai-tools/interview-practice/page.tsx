import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';
import { ArrowLeft } from 'lucide-react';

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
    <div className="wa-space-y-8">
      {/* ── Header ── */}
      <header>
        <Link
          href="/dashboard/ai-tools"
          className="wa-inline-flex wa-items-center wa-gap-1.5 wa-text-sm wa-font-medium wa-text-m3-primary hover:wa-underline wa-mb-4"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to AI Tools
        </Link>
        <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-1">
          AI Career Optimization
        </p>
        <h1 className="wa-text-3xl wa-font-extrabold wa-tracking-tight wa-text-m3-on-surface">
          Interview Practice Generator
        </h1>
        <p className="wa-mt-1 wa-text-sm wa-text-m3-on-surface-variant wa-max-w-2xl">
          Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.
        </p>
      </header>

      {/* ── Form card ── */}
      <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6 wa-max-w-3xl">
        <InterviewPracticeForm />
        <InterviewPracticeSaved results={savedResults} />
      </div>
    </div>
  );
}
