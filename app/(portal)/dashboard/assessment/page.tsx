import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { canBypassMemberAssessment } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AssessmentForm from '@/components/portal/AssessmentForm';
import PageHeader from '@/components/portal/PageHeader';
import Link from 'next/link';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import { formatPortalDate } from '@/lib/formatDate';

const PAGE_TITLE = 'Training Preassessment';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('assessmentMetaTitle'),
    description: t('assessmentMetaDesc'),
    path: '/dashboard/assessment',
  });
}

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirect?.trim();
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/assessment');

  const [dbUser, staffBypass] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        courseEnrollments: {
          where: { isPrimary: true },
          select: { enrolledByAdminId: true },
          take: 1,
        },
      },
    }),
    canBypassMemberAssessment(user.id),
  ]);

  if (!dbUser) redirect('/login');

  return (
    <div className="inner-page">
      <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
        <PageHeader
          title={PAGE_TITLE}
          subtitle={
            dbUser.assessmentCompleted
              ? 'On file for you and your counselor.'
              : 'A short skills check before Coursera courses unlock.'
          }
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: PAGE_TITLE },
          ]}
        />
      </div>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px' }}>
          {dbUser.assessmentCompleted ? (
            <AssessmentCompletedCard
              scorePct={dbUser.assessmentScorePct}
              completedAt={dbUser.assessmentCompletedAt}
              programInterest={dbUser.programInterest}
            />
          ) : dbUser.interviewCompletedAt == null && !staffBypass ? (
            <AssessmentLockedCard
              interviewRequestedAt={dbUser.interviewRequestedAt}
              interviewEligible={dbUser.interviewEligible}
            />
          ) : (
            <AssessmentReady
              dbUser={dbUser}
              redirectTo={redirectTo}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function AssessmentCompletedCard({
  scorePct,
  completedAt,
  programInterest,
}: {
  scorePct: number | null;
  completedAt: Date | null;
  programInterest: string | null;
}) {
  return (
    <div className="portal-card portal-card--flat portal-card--padded">
      {scorePct != null ? (
        <p
          style={{
            margin: 0,
            fontSize: 'clamp(2.75rem, 9vw, 3.75rem)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--wa-text)',
          }}
        >
          {scorePct}
          <span
            style={{
              marginLeft: '0.12em',
              fontSize: '0.38em',
              fontWeight: 700,
              color: 'var(--wa-muted)',
            }}
          >
            %
          </span>
        </p>
      ) : null}
      <h2 style={{ margin: scorePct != null ? '0.75rem 0 0.35rem' : '0 0 0.5rem', fontSize: '1.125rem' }}>
        Preassessment complete
      </h2>
      <p style={{ color: 'var(--wa-muted)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
        {[
          completedAt ? `Finished ${formatPortalDate(completedAt)}` : null,
          programInterest,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link href="/dashboard/training" className="btn btn-primary" style={{ minHeight: 44 }}>
          Continue training
        </Link>
        <Link href="/dashboard" className="btn btn-outline" style={{ minHeight: 44 }}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function AssessmentLockedCard({
  interviewRequestedAt,
  interviewEligible,
}: {
  interviewRequestedAt: Date | null;
  interviewEligible: boolean;
}) {
  return (
    <div className="portal-card portal-card--flat portal-card--padded">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)' }}
        >
          lock
        </span>
        <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Unlocks after intake</h2>
      </div>
      <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Talk with our team first. Then this preassessment personalizes your learning path.
      </p>
      {interviewRequestedAt ? (
        <p style={{ margin: 0, color: 'var(--color-on-surface)', fontWeight: 600 }}>
          Requested on {formatPortalDate(interviewRequestedAt)} — we&apos;ll schedule it.
        </p>
      ) : interviewEligible ? (
        <MemberInterviewRequestButton />
      ) : (
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>
          Finish pre-screening on your dashboard, then request intake.
        </p>
      )}
    </div>
  );
}

function AssessmentReady({
  dbUser,
  redirectTo,
}: {
  dbUser: {
    fullName: string | null;
    phone: string | null;
    profile: {
      profilePhone: string | null;
      profileAddress: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      referralSource: string | null;
    } | null;
    courseEnrollments: Array<{ enrolledByAdminId: string | null }>;
  };
  redirectTo: string | undefined;
}) {
  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';
  const starterProfileReview = getCounselorStarterProfileReview({
    wasCounselorCreated: !!dbUser.courseEnrollments[0]?.enrolledByAdminId,
    phone: dbUser.phone,
    profilePhone: dbUser.profile?.profilePhone,
    profileAddress: dbUser.profile?.profileAddress,
    city: dbUser.profile?.city,
    state: dbUser.profile?.state,
    zip: dbUser.profile?.zip,
    referralSource: dbUser.profile?.referralSource,
  });
  const starterProfileMissingLabels = getStarterProfileFieldLabels(starterProfileReview.missing);

  if (starterProfileReview.required) {
    return (
      <div
        className="portal-card portal-card--flat portal-card--padded"
        style={{ border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)' }}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Confirm your details first</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Your counselor started this account. Confirm contact and referral details before the preassessment.
          {starterProfileMissingLabels.length ? ` Missing: ${starterProfileMissingLabels.join(', ')}.` : ''}
        </p>
        <Link href="/dashboard/profile" className="btn btn-primary">Review profile</Link>
      </div>
    );
  }

  return (
    <AssessmentForm
      defaultFirstName={firstName}
      defaultLastName={lastName}
      defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
      defaultRedirectTo={redirectTo || undefined}
    />
  );
}
