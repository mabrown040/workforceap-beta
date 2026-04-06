import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';
import MobileBottomNav from '@/components/MobileBottomNav';

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
    <>
      <h1 className="wa-sr-only">Interview Practice</h1>
      <div style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/dashboard/ai-tools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← AI Tools
          </Link>
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.75rem',
            }}
          >
            <Link href="/dashboard/ai-tools" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
              AI Tools
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden>
              chevron_right
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>Interview Practice</span>
          </nav>
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
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12, marginBottom: '1rem', background: 'var(--surface-container-low)' }}>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Generate tailored interview questions for any role. Choose behavioral, technical, or situational focus and get
              structured prompts you can practice out loud or in writing.
            </p>
          </div>

          <div className="stitch-card" style={{ padding: '1.25rem', borderRadius: 12, marginBottom: '1.5rem' }}>
            <InterviewPracticeForm />
          </div>

          <InterviewPracticeSaved results={savedResults} />
        </div>

        <MobileBottomNav variant="portal" />
      </div>
    </>
  );
}
