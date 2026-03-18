import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import Footer from '@/components/Footer';
import DashboardProfileForm from '@/components/portal/DashboardProfileForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Profile',
  description: 'View and edit your profile.',
  path: '/dashboard/profile',
});

export default async function DashboardProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/profile');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!dbUser) redirect('/login');

  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const assessmentAnswers = dbUser.assessmentAnswers as Record<number, string> | null;

  return (
    <>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>My Profile</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Manage your contact information and career goals.
      </p>

      <div className="dashboard-profile-section">
        <h3>Contact info</h3>
        <DashboardProfileForm
          defaultFirstName={firstName}
          defaultLastName={lastName}
          defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
          defaultAddress={dbUser.profile?.profileAddress ?? ''}
          defaultLinkedin={dbUser.profile?.profileLinkedin ?? ''}
          defaultBio={dbUser.profile?.profileBio ?? ''}
        />
      </div>

      <div className="dashboard-profile-section">
        <h3>Account</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', margin: 0 }}>
          <strong>Email:</strong> {dbUser.email} (tied to account, cannot be changed here)
        </p>
      </div>

      {dbUser.assessmentCompleted && (
        <div className="dashboard-profile-section">
          <h3>Assessment</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
            <strong>Assessment Score:</strong> {dbUser.assessmentScore ?? 0}/90 ({dbUser.assessmentScorePct ?? 0}%) — completed{' '}
            {dbUser.assessmentCompletedAt?.toLocaleDateString() ?? ''}
          </p>
          <details style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View My Answers</summary>
            {assessmentAnswers && (
              <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                {ASSESSMENT_QUESTIONS.map((q) => (
                  <li key={q.id} style={{ marginBottom: '0.5rem' }}>
                    Q{q.id}: {q.question} → {assessmentAnswers[q.id] ?? '—'}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      )}

      {program && (
        <div className="dashboard-profile-section">
          <h3>Program</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', margin: 0 }}>
            <strong>Current Program:</strong>{' '}
            <Link href="/dashboard/program">{program.title}</Link>
            {dbUser.enrolledAt && ` — Enrolled ${dbUser.enrolledAt.toLocaleDateString()}`}
          </p>
        </div>
      )}

      <Footer />
    </>
  );
}
