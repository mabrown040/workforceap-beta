import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AssessmentForm from '@/components/portal/AssessmentForm';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import Link from 'next/link';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Skills Snapshot',
  description: 'A quick 10-minute skills snapshot before your Coursera courses are activated.',
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
    include: { profile: true, courseEnrollment: { select: { enrolledByAdminId: true } } },
  });

  if (!dbUser) redirect('/login');

  if (dbUser.assessmentCompleted) {
    redirect('/dashboard');
  }

  if (dbUser.interviewCompletedAt == null) {
    redirect('/dashboard/skills-assessment');
  }

  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';
  const starterProfileReview = getCounselorStarterProfileReview({
    wasCounselorCreated: !!dbUser.courseEnrollment?.enrolledByAdminId,
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
              <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.125rem' }}>Review your starter details first</h2>
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

    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
