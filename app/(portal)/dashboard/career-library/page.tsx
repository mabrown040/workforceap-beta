import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getMemberResources } from '@/lib/content/memberResources';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import ResourcesClient from '@/app/(portal)/resources/ResourcesClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Resources',
  description: 'Practical job-seeker resources by career stage. Resume, interviewing, career planning, AI skills, and job search.',
  path: '/dashboard/career-library',
});

export default async function DashboardCareerLibraryPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-library');

  const resources = await getMemberResources();
  let resourcesProgress: Awaited<ReturnType<typeof prisma.resourceProgress.findMany>> = [];
  try {
    resourcesProgress = await prisma.resourceProgress.findMany({ where: { userId: user.id } });
  } catch (e) {
    console.error('[career-library] progress query failed', e);
  }
  const progressByResource = Object.fromEntries(
    resourcesProgress.map((p) => [p.resourceId, { completedAt: p.completedAt, savedAt: p.savedAt }])
  );

  return (
    <>
      <div className="inner-page wa-pb-24 md:wa-pb-8">
        <section className="page-hero">
          <div className="page-hero-content page-hero-content--split">
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <PortalBreadcrumb
                  variant="on-dark"
                  items={[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/dashboard/learning', label: 'Learning hub' },
                    { label: 'Career library' },
                  ]}
                />
              </div>
              <h1>Career resource library</h1>
              <p>Practical job-seeker resources by career stage. Filter by category or stage to find what you need.</p>
            </div>
            <div className="page-hero-actions">
              <Link href="/dashboard/learning" className="btn btn-outline">
                Learning hub
              </Link>
              <Link href="/dashboard" className="btn btn-outline">
                Dashboard
              </Link>
              <SignOutButton className="btn btn-outline" />
            </div>
          </div>
        </section>

        <section className="content-section">
          <div className="container">
            <ResourcesClient resources={resources} progressByResource={progressByResource} />
          </div>
        </section>

      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
