import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import AssessmentForm from '@/components/portal/AssessmentForm';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Skills Snapshot',
  description: 'A quick 10-minute skills snapshot before your Coursera courses are activated.',
  path: '/dashboard/assessment',
});

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
    include: { profile: true },
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

  return (
    <>
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>One quick step before your training begins</h1>
          <p>
            Before we connect you with your Coursera courses, we need a 10-minute skills snapshot.
            This helps your counselor personalize your learning path and identify any additional support resources.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '720px' }}>
          <AssessmentForm
            defaultFirstName={firstName}
            defaultLastName={lastName}
            defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
            defaultRedirectTo={redirectTo || undefined}
          />
        </div>
      </section>

    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
