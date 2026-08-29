import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getMemberResourcesResult } from '@/lib/content/memberResources';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';
import { SignOutButton } from '@/components/portal/SignOutButton';
import PageHeader from '@/components/portal/PageHeader';
import ResourcesClient from '@/app/(portal)/resources/ResourcesClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('careerLibraryMetaTitle'),
    description: t('careerLibraryMetaDesc'),
    path: '/dashboard/career-library',
  });
}

export default async function DashboardCareerLibraryPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-library');

  const requestHeaders = await headers();
  const readOnlyAudit = isReadOnlyPortalAuditHeader(requestHeaders);
  const resourcesResult = await getMemberResourcesResult({ readOnlyAudit });
  const resources = resourcesResult.resources;
  let resourcesProgress: Awaited<ReturnType<typeof prisma.resourceProgress.findMany>> = [];
  let progressLoadFailed = false;
  try {
    resourcesProgress = await prisma.resourceProgress.findMany({ take: 500, where: { userId: user.id } });
  } catch (e) {
    progressLoadFailed = true;
    console.error('[career-library] progress query failed', e);
  }
  const progressByResource = Object.fromEntries(
    resourcesProgress.map((p) => [p.resourceId, { completedAt: p.completedAt, savedAt: p.savedAt }])
  );

  return (
    <>
      <div className="inner-page wa-pb-24 md:wa-pb-8">
        {resourcesResult.loadFailed ? (
          <span hidden data-portal-error-state="career-library-resource-catalog-load" />
        ) : null}
        {progressLoadFailed ? <span hidden data-portal-error-state="career-library-progress-load" /> : null}
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
