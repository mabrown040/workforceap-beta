import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import EligibilityForm, { type EligibilityInitial } from './EligibilityForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Eligibility Info',
    description: 'Complete or update your eligibility information.',
    path: '/dashboard/eligibility',
  });
}

const AGE_GROUP_VALUES = ['18_24', '25_50', '50_plus'] as const;
type AgeGroupValue = (typeof AGE_GROUP_VALUES)[number] | '';

export default async function EligibilityPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/eligibility');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      wioaQualificationJson: true,
      profile: { select: { city: true, state: true, zip: true, barrierTypes: true } },
    },
  });

  const snapshot = (dbUser?.wioaQualificationJson ?? null) as Record<string, unknown> | null;
  const meta =
    snapshot && typeof snapshot.eligibilityForm === 'object' && snapshot.eligibilityForm !== null
      ? (snapshot.eligibilityForm as { ageGroup?: string | null; county?: string | null })
      : null;

  const rawAge = meta?.ageGroup ?? '';
  const ageGroup: AgeGroupValue = (AGE_GROUP_VALUES as readonly string[]).includes(rawAge)
    ? (rawAge as AgeGroupValue)
    : '';

  const initial: EligibilityInitial = {
    ageGroup,
    city: dbUser?.profile?.city ?? '',
    state: dbUser?.profile?.state ?? '',
    zip: dbUser?.profile?.zip ?? '',
    county: meta?.county ?? '',
    primaryBarriers: dbUser?.profile?.barrierTypes ?? [],
  };

  return (
    <div className="portal-profile-page" style={{ paddingBottom: '2rem', maxWidth: '720px' }}>
      <div className="portal-profile-section-card">
        <div className="portal-profile-section-card__header">
          <h1 className="portal-profile-section-card__title">Complete / update your eligibility info</h1>
        </div>
        <div className="portal-profile-section-card__body">
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-on-surface-variant)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Keep your WorkforceAP file up to date. This information helps us confirm program fit and
            connect you with the right supportive services. It is pre-filled with what we already
            have — review it, make any changes, and save.
          </p>
          <EligibilityForm initial={initial} />
        </div>
      </div>
    </div>
  );
}
