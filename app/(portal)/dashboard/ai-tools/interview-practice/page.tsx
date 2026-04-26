import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Interview Practice Generator',
  description: 'Generate role-specific interview questions with answer frameworks.',
  path: '/dashboard/ai-tools/interview-practice',
});

export default async function InterviewPracticePage() {
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
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Interview Practice' },
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }} aria-hidden>
                psychology
              </span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                Interview Practice
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>
                Role-specific questions with STAR-style answer frameworks.
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Generate tailored interview questions for any role. Choose behavioral, technical, or situational focus and get
              structured prompts you can practice out loud or in writing.
            </p>
          </div>

          <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', borderRadius: 12, marginBottom: '1.5rem' }}>
            <InterviewPracticeForm />
          </div>

          <InterviewPracticeSaved results={savedResults} />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
