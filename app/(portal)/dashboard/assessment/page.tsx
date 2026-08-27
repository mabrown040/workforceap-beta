import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { canBypassMemberAssessment } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AssessmentForm from '@/components/portal/AssessmentForm';
import { DesignSurface, PageOpener } from '@/components/portal/kit';
import Link from 'next/link';
import { ClipboardCheck, Lock } from 'lucide-react';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import { formatPortalDate } from '@/lib/formatDate';

const PAGE_TITLE = 'Skills check';

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
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--wa-pad-sm)' }} className="wa-space-y-6">
        <PageOpener
          kicker="Preassessment"
          title={PAGE_TITLE}
          lede={
            dbUser.assessmentCompleted
              ? 'On file for you and your counselor.'
              : '35 questions. Then Coursera courses unlock.'
          }
          icon={<ClipboardCheck size={13} aria-hidden="true" />}
        />
        <div style={{ maxWidth: 720 }}>
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
      </div>
    </DesignSurface>
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
    <div className="wa-kit-card">
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
      <h2
        style={{
          margin: scorePct != null ? '0.75rem 0 0.35rem' : '0 0 0.5rem',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        Preassessment complete
      </h2>
      <p style={{ color: 'var(--wa-muted)', lineHeight: 1.5, margin: '0 0 1.25rem', fontSize: 14 }}>
        {[
          completedAt ? `Finished ${formatPortalDate(completedAt)}` : null,
          programInterest,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link
          href="/dashboard/training"
          className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
          style={{
            minHeight: 44,
            padding: '10px 16px',
            background: 'var(--wa-accent)',
            color: 'var(--wa-on-accent)',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Continue training
        </Link>
        <Link
          href="/dashboard"
          className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
          style={{
            minHeight: 44,
            padding: '10px 16px',
            background: 'transparent',
            color: 'var(--wa-accent)',
            border: '1px solid var(--wa-border)',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Open home
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
    <div className="wa-kit-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Lock size={18} aria-hidden="true" style={{ color: 'var(--wa-muted)', flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Unlocks after intake
        </h2>
      </div>
      <p style={{ color: 'var(--wa-muted)', lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
        Complete intake first. Then this check unlocks.
      </p>
      {interviewRequestedAt ? (
        <p style={{ margin: 0, color: 'var(--wa-text)', fontWeight: 600, fontSize: 14 }}>
          Requested on {formatPortalDate(interviewRequestedAt)} — we&apos;ll schedule it.
        </p>
      ) : interviewEligible ? (
        <MemberInterviewRequestButton />
      ) : (
        <p style={{ margin: 0, color: 'var(--wa-muted)', fontSize: 14 }}>
          Finish pre-screening on home, then request intake.
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
      <div className="wa-kit-card">
        <h2 style={{ margin: '0 0 0.5rem', fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Confirm your details first
        </h2>
        <p style={{ color: 'var(--wa-muted)', lineHeight: 1.6, marginBottom: 16, fontSize: 14 }}>
          Your counselor started this account. Confirm contact and referral details before the preassessment.
          {starterProfileMissingLabels.length ? ` Missing: ${starterProfileMissingLabels.join(', ')}.` : ''}
        </p>
        <Link
          href="/dashboard/profile"
          className="wa-kit-focus hover:wa-opacity-90 wa-inline-flex wa-items-center wa-justify-center"
          style={{
            minHeight: 44,
            padding: '10px 16px',
            background: 'var(--wa-accent)',
            color: 'var(--wa-on-accent)',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Review profile
        </Link>
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
