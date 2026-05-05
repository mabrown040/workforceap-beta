import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getMemberResources } from '@/lib/content/memberResources';
import { SignOutButton } from '@/components/portal/SignOutButton';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import ResourceViewTracker from '@/components/portal/ResourceViewTracker';
import ResourceProgressActions from '@/components/portal/ResourceProgressActions';
import ResourceDownloadButton from '@/components/portal/ResourceDownloadButton';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resources = await getMemberResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) return { title: 'Resource not found' };
  return buildPageMetadataAsync({
    title: resource.title,
    description: resource.summary,
    path: `/dashboard/career-library/${id}`,
  });
}

export default async function DashboardCareerLibraryDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-library');

  const { id } = await params;
  const resources = await getMemberResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) notFound();

  const { prisma } = await import('@/lib/db/prisma');
  let progress = null;
  try {
    progress = await prisma.resourceProgress.findUnique({
      where: { userId_resourceId: { userId: user.id, resourceId: id } },
    });
  } catch (e) {
    console.error('[career-library detail] progress query failed', e);
  }

  let content = '';
  if (resource.file) {
    try {
      const filePath = join(process.cwd(), 'content', 'member-resources', resource.file);
      content = readFileSync(filePath, 'utf-8');
    } catch {
      content = '*Content not available.*';
    }
  }

  return (
    <>
      <div className="inner-page wa-pb-24 md:wa-pb-8">
        <ResourceViewTracker resourceId={id} />
        <section className="page-hero">
          <div className="page-hero-content page-hero-content--split">
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <PortalBreadcrumb
                  variant="on-dark"
                  items={[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/dashboard/learning', label: 'Learning hub' },
                    { href: '/dashboard/career-library', label: 'Career library' },
                    { label: resource.title },
                  ]}
                />
              </div>
              <h1>{resource.title}</h1>
              <p>{resource.summary}</p>
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
            <div className="resource-detail-actions">
              <ResourceProgressActions
                resourceId={id}
                progress={progress ? { completedAt: progress.completedAt, savedAt: progress.savedAt } : null}
              />
              {resource.file && <ResourceDownloadButton resourceId={id} resourceTitle={resource.title} />}
            </div>
            <article className="resource-content markdown-body">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </div>
        </section>

      </div>    </>
  );
}
