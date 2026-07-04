import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import SurveyClient from './SurveyClient';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Placement Survey',
    description: 'Share feedback about your placement experience.',
    path: '/dashboard/survey',
  });
}

export default async function SurveyPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/survey');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      placementRecord: { select: { id: true } },
      placementSurveys: { take: 1, select: { completedAt: true } },
    },
  });

  if (!dbUser) redirect('/login');

  const placementId = dbUser.placementRecord?.id ?? null;
  const alreadyCompleted = dbUser.placementSurveys[0]?.completedAt != null;

  return (
    <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '0 1rem 2rem' }}>
      <PageHeader
        title="Placement Survey"
        subtitle="Help us improve by sharing feedback about your job placement experience."
      />

      {!placementId ? (
        <div
          className="portal-card portal-card--flat"
          style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '2.5rem',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '0.75rem',
              display: 'block',
            }}
            aria-hidden="true"
          >
            info
          </span>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-on-surface)' }}>
            No placement on file
          </p>
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface-variant)',
              lineHeight: 1.5,
            }}
          >
            This survey becomes available once you have been placed with an employer.
            If you believe this is an error, please contact your career counselor.
          </p>
        </div>
      ) : alreadyCompleted ? (
        <div
          className="portal-card portal-card--flat"
          style={{ padding: '2rem 1.5rem', textAlign: 'center' }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '2.5rem',
              color: 'var(--color-success, #16a34a)',
              marginBottom: '0.75rem',
              display: 'block',
            }}
            aria-hidden="true"
          >
            check_circle
          </span>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Survey already completed
          </p>
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface-variant)',
              lineHeight: 1.5,
            }}
          >
            Thank you for sharing your feedback. Your responses help us improve training
            and support for future members.
          </p>
        </div>
      ) : (
        <SurveyClient userId={dbUser.id} placementId={placementId} />
      )}
    </div>
  );
}
