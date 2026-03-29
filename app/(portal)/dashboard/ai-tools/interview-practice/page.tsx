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
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
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
            <span className="material-symbols-outlined" style={{ fontSize: '1.35rem', color: 'var(--color-accent)' }}>record_voice_over</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Interview Practice Generator</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
              Generate role-specific interview questions with answer frameworks.
            </p>
          </div>
        </div>
      </div>

      {/* Focus area cards */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
        <p className="text-label-upper" style={{ fontSize: '0.7rem', marginBottom: '0.75rem' }}>Focus Area</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Behavioral', icon: 'psychology', desc: 'STAR method questions' },
            { label: 'Technical', icon: 'code', desc: 'Role-specific skills' },
            { label: 'Case Study', icon: 'analytics', desc: 'Problem-solving scenarios' },
          ].map((area) => (
            <div
              key={area.label}
              className="stitch-card"
              style={{
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                border: area.label === 'Behavioral' ? '1px solid var(--color-accent)' : undefined,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', display: 'block', marginBottom: '0.4rem' }}>
                {area.icon}
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{area.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{area.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        <div className="stitch-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <InterviewPracticeForm />
        </div>

        {/* Professional Mode + Archive badge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            className="stitch-card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.3rem', color: 'var(--color-accent)' }}>workspace_premium</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Professional Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>Industry-grade interview simulation with timed responses</div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              background: 'var(--surface-container-high)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>verified</span>
            Archive Certified
          </div>
        </div>

        {/* Saved results */}
        <InterviewPracticeSaved results={savedResults} />
      </div>
    </div>
  );
}
