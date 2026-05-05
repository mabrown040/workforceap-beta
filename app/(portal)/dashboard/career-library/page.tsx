import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getMemberResources } from '@/lib/content/memberResources';
import { SignOutButton } from '@/components/portal/SignOutButton';
import PageHeader from '@/components/portal/PageHeader';
import ResourcesClient from '@/app/(portal)/resources/ResourcesClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Career Resources',
  description: 'Practical job-seeker resources by career stage. Resume, interviewing, career planning, AI skills, and job search.',
  path: '/dashboard/career-library',
});
}

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
        <div style={{ padding: '1.25rem clamp(1rem, 4vw, 2rem) 1.5rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <PageHeader
            title="Career resource library"
            subtitle="Practical job-seeker resources by career stage. Filter by category or stage to find what you need."
            breadcrumbs={[
              { label: 'Member Portal', href: '/dashboard' },
              { label: 'Learning hub', href: '/dashboard/learning' },
              { label: 'Career library' },
            ]}
            action={
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link href="/dashboard/learning" className="btn btn-outline">
                  Learning hub
                </Link>
                <Link href="/dashboard" className="btn btn-outline">
                  Dashboard
                </Link>
                <SignOutButton className="btn btn-outline" />
              </div>
            }
          />
        </div>

        <section className="content-section">
          <div className="container">
            <ResourcesClient resources={resources} progressByResource={progressByResource} />
          </div>
        </section>

      </div>    </>
  );
}
