import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import { StatusCard } from '@/components/portal/StatusCard';
import { SignOutButton } from '@/components/portal/SignOutButton';
import StartHereCard from '@/components/portal/StartHereCard';
import ReadinessProgress from '@/components/portal/ReadinessProgress';
import BenefitAccessCard from '@/components/portal/BenefitAccessCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member dashboard',
  description: 'View your application status and member resources.',
  path: '/dashboard',
});

function getBenefitStatus(
  requests: Array<{ benefit: string; status: string }>,
  benefitId: string
): 'not_requested' | 'pending' | 'active' {
  const req = requests.find((r) => r.benefit === benefitId);
  if (!req) return 'not_requested';
  if (req.status === 'APPROVED') return 'active';
  if (req.status === 'PENDING') return 'pending';
  return 'not_requested';
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      applications: { orderBy: { createdAt: 'desc' } },
      jobApplications: true,
      benefitRequests: true,
    },
  });

  const application = dbUser?.applications?.[0];
  const profile = dbUser?.profile;

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Welcome back{dbUser?.fullName ? `, ${dbUser.fullName.split(' ')[0]}` : ''}</h1>
            <p>Manage your application and access member resources.</p>
          </div>
          <SignOutButton />
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="dashboard-grid" style={{ display: 'grid', gap: '2rem', maxWidth: '900px' }}>
            <StartHereCard />
            <ReadinessProgress
              profileComplete={!!profile?.address || !!profile?.zip}
              toolsUsed={0}
              applicationsSubmitted={dbUser?.jobApplications?.length ?? dbUser?.applications?.length ?? 0}
            />
            {application && (
              <StatusCard
                status={application.status}
                programInterest={application.programInterest}
                submittedAt={application.submittedAt}
              />
            )}

            <div className="benefit-cards">
              <BenefitAccessCard
                benefitId="linkedin_premium"
                name="LinkedIn Premium"
                status={getBenefitStatus(dbUser?.benefitRequests ?? [], 'linkedin_premium')}
                description="Access premium features to stand out to recruiters."
              />
              <BenefitAccessCard
                benefitId="coursera"
                name="Coursera"
                status={getBenefitStatus(dbUser?.benefitRequests ?? [], 'coursera')}
                description="Industry certifications and courses at no cost."
              />
            </div>

            <div className="dashboard-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Link href="/ai-tools" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
                AI Career Tools
              </Link>
              <Link href="/resources" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
                View resources
              </Link>
              <Link href="/career-brief" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
                Weekly Career Brief
              </Link>
              <Link href="/applications" className="btn btn-primary" style={{ padding: '1rem', textAlign: 'center' }}>
                Job Applications
              </Link>
              {profile && (
                <div style={{ background: 'var(--color-light)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Profile</h3>
                  <p style={{ fontSize: '.9rem', color: 'var(--color-gray-600)' }}>
                    {dbUser?.email} &bull; {profile.zip ? `ZIP ${profile.zip}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
