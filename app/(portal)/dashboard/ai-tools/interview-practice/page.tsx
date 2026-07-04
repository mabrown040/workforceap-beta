import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import { prefillInterviewPractice } from '@/lib/ai/prefillFromMemberState';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('interviewPracticeMetaTitle'),
    description: t('interviewPracticeMetaDesc'),
    path: '/dashboard/ai-tools/interview-practice',
  });
}

type SearchParams = Promise<{ prefill?: string; role?: string }>;

export default async function InterviewPracticePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/interview-practice');

  let savedResults: { id: string; inputSummary: string | null; output: string | null; createdAt: Date }[] = [];
  try {
    savedResults = await prisma.aIToolResult.findMany({
      where: { userId: user.id, toolType: 'interview_practice' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, inputSummary: true, output: true, createdAt: true },
    });
  } catch {
    // Non-fatal — page renders with empty saved results
  }

  const sp = await searchParams;
  const shouldPrefill = sp.prefill === 'true';
  let initialData: { role: string; experienceLevel: 'entry' | 'mid' | 'senior'; resumeContext: string } | null = null;
  if (shouldPrefill) {
    try {
      initialData = await prefillInterviewPractice(user.id);
    } catch (err) {
      console.error('[interview-practice page] prefill failed', err);
    }
  }
  // URL role param overrides prefill
  if (sp.role) {
    initialData = { ...(initialData ?? { experienceLevel: 'mid', resumeContext: '' }), role: sp.role };
  }

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
            title="Interview Practice"
            subtitle="Role-specific questions with STAR-style answer frameworks."
            breadcrumbs={[
              { label: 'Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Interview Practice' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Generate tailored interview questions for any role. Choose behavioral, technical, or situational focus and get
              structured prompts you can practice out loud or in writing.
            </p>
          </div>

          <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', borderRadius: 12, marginBottom: '1.5rem' }}>
            <InterviewPracticeForm memberId={user.id} initialData={initialData} />
          </div>

          <InterviewPracticeSaved results={savedResults} />
        </div>
      </div>
    </>
  );
}
