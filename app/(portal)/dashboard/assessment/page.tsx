import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AssessmentForm from '@/components/portal/AssessmentForm';
import AssessmentRetakeButton from '@/components/portal/AssessmentRetakeButton';
import PageHeader from '@/components/portal/PageHeader';
import Link from 'next/link';
import { TOTAL_POINTS_PUBLIC } from '@/lib/assessment/questions';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import { formatPortalDateTime } from '@/lib/formatDate';

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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      // Multi-program: read enrolledByAdminId from the primary enrollment;
      // counselor-created intent is tracked on the primary row.
      courseEnrollments: {
        where: { isPrimary: true },
        select: { enrolledByAdminId: true },
        take: 1,
      },
    },
  });

  if (!dbUser) redirect('/login');

  // Completed members used to be silently bounced to /dashboard, which made every
  // "Training Preassessment" link feel broken (click → land back home with no
  // explanation). Render their result with a path to review answers or retake.
  if (dbUser.assessmentCompleted) {
    return (
      <div className="inner-page">
        <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <PageHeader
            title="Skills snapshot"
            subtitle="You've already completed your Training Preassessment — here's where you landed."
            breadcrumbs={[
              { label: 'Member Portal', href: '/dashboard' },
              { label: 'Skills snapshot' },
            ]}
          />
        </div>

        <section className="content-section">
          <div className="container" style={{ maxWidth: '720px' }}>
            <div className="portal-card portal-card--flat portal-card--padded">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: '1.25rem', color: 'var(--color-green, #4a9b4f)' }}
                >
                  task_alt
                </span>
                <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Preassessment complete</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem' }}>
                    Score
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>
                    {dbUser.assessmentScorePct ?? 0}
                    <span style={{ fontSize: '1rem' }}>%</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
                    {dbUser.assessmentScore ?? 0}/{TOTAL_POINTS_PUBLIC} points
                  </p>
                </div>
                {dbUser.assessmentCompletedAt ? (
                  <div>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem' }}>
                      Completed
                    </p>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                      {formatPortalDateTime(dbUser.assessmentCompletedAt)}
                    </p>
                  </div>
                ) : null}
              </div>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Your counselor uses this snapshot to personalize your learning path. You can review
                your answers on your profile, or retake the assessment if things have changed.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link href="/dashboard/profile" className="btn btn-primary">Review my answers</Link>
                <AssessmentRetakeButton />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Not-yet-interviewed members used to be bounced through /dashboard/skills-assessment
  // → AI tools. Render an inline explanatory state instead, with a path forward
  // (request the interview) when the member is eligible.
  if (dbUser.interviewCompletedAt == null) {
    return (
      <div className="inner-page">
        <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <PageHeader
            title="Skills snapshot"
            subtitle="Your skills assessment unlocks after your intake conversation with our team."
            breadcrumbs={[
              { label: 'Member Portal', href: '/dashboard' },
              { label: 'Skills snapshot' },
            ]}
          />
        </div>

        <section className="content-section">
          <div className="container" style={{ maxWidth: '720px' }}>
            <div className="portal-card portal-card--flat portal-card--padded">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)' }}
                >
                  lock
                </span>
                <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Not available yet</h2>
              </div>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Your skills assessment unlocks after your intake conversation with our team. That short
                conversation helps your counselor personalize your learning path before we ask you to
                complete a skills snapshot.
              </p>
              {dbUser.interviewRequestedAt ? (
                <p style={{ margin: 0, color: 'var(--color-on-surface)', fontWeight: 600 }}>
                  Requested on {formatPortalDateTime(dbUser.interviewRequestedAt)} — we&apos;ll be in touch to schedule it.
                </p>
              ) : dbUser.interviewEligible ? (
                <MemberInterviewRequestButton />
              ) : (
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>
                  Complete your pre-screening from your dashboard home to become eligible to request an
                  intake interview.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

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

  return (
    <>
    <div className="inner-page">
      <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
        <PageHeader
          title="Skills snapshot"
          subtitle="Before we connect you with your Coursera courses, we need a quick skills snapshot. This helps your counselor personalize your learning path and identify any additional support resources."
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Skills snapshot' },
          ]}
        />
      </div>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px' }}>
          {starterProfileReview.required ? (
            <div
              className="portal-card portal-card--flat portal-card--padded"
              style={{ border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: '1.25rem', color: 'var(--color-accent)' }}
                >
                  checklist
                </span>
                <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Review your starter details first</h2>
              </div>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Your counselor started this account for you. Before WorkforceAP unlocks your Training Preassessment,
                confirm your contact and referral details on your profile.
                {starterProfileMissingLabels.length ? ` Missing now: ${starterProfileMissingLabels.join(', ')}.` : ''}
              </p>
              <Link href="/dashboard/profile" className="btn btn-primary">Review profile</Link>
            </div>
          ) : (
            <AssessmentForm
              defaultFirstName={firstName}
              defaultLastName={lastName}
              defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
              defaultRedirectTo={redirectTo || undefined}
            />
          )}
        </div>
      </section>

    </div>    </>
  );
}
