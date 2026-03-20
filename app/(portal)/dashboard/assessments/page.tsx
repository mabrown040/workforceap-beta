import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { CheckCircle, FileQuestion, ArrowRight } from 'lucide-react';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skills Assessment',
  description: 'View your assessment status and career readiness.',
  path: '/dashboard/assessments',
});

export default async function AssessmentsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/assessments');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id, deletedAt: null },
    select: {
      assessmentCompleted: true,
      assessmentCompletedAt: true,
      assessmentScorePct: true,
      assessmentScore: true,
      enrolledProgram: true,
    },
  });

  if (!dbUser) redirect('/login');

  const completed = dbUser.assessmentCompleted ?? false;

  return (
    <div className="assessments-page">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Skills Assessment</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Your skills snapshot helps us personalize your learning path and connect you with career support.
      </p>

      <div
        className="assessments-card"
        style={{
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border, #e5e5e5)',
          background: 'var(--color-light)',
          maxWidth: 560,
        }}
      >
        {completed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <CheckCircle size={28} style={{ color: 'var(--color-accent)', flexShrink: 0 }} aria-hidden />
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Assessment complete</h2>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dbUser.assessmentCompletedAt && (
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Completed:</strong>{' '}
                  {new Date(dbUser.assessmentCompletedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </li>
              )}
              {dbUser.assessmentScorePct != null && (
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Score:</strong> {dbUser.assessmentScorePct}%
                </li>
              )}
              {dbUser.enrolledProgram && (
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Program:</strong>{' '}
                  {getProgramBySlug(dbUser.enrolledProgram)?.title ?? dbUser.enrolledProgram}
                </li>
              )}
            </ul>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/dashboard/readiness" className="btn btn-primary">
                View Career Readiness <ArrowRight size={16} style={{ marginLeft: '0.25rem', verticalAlign: 'middle' }} />
              </Link>
              <Link href="/dashboard/training" className="btn btn-outline">
                Go to Training
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileQuestion size={28} style={{ color: 'var(--color-gray-500)', flexShrink: 0 }} aria-hidden />
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Assessment not yet completed</h2>
            </div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)' }}>
              Complete a quick 10-minute skills snapshot so we can tailor your learning path and identify support resources. This step is required before you can access your training courses.
            </p>
            <Link href="/dashboard/assessment" className="btn btn-primary">
              Take Assessment
            </Link>
          </>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Why we ask</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', maxWidth: 560 }}>
          Your answers help counselors personalize your learning path, recommend certifications, and connect you with job placement resources. Results are used only to support your success.
        </p>
      </div>
    </div>
  );
}
