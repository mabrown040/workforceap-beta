import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import ReactMarkdown from 'react-markdown';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getMemberResources } from '@/lib/content/memberResources';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import ResourceViewTracker from '@/components/portal/ResourceViewTracker';
import ResourceProgressActions from '@/components/portal/ResourceProgressActions';
import ResourceDownloadButton from '@/components/portal/ResourceDownloadButton';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resources = await getMemberResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) return { title: 'Resource not found' };
  return buildPageMetadata({
    title: resource.title,
    description: resource.summary,
    path: `/resources/${id}`,
  });
}

export default async function ResourceDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/resources');

  const { id } = await params;
  const resources = await getMemberResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource) notFound();

  const { prisma } = await import('@/lib/db/prisma');
  const progress = await prisma.resourceProgress.findUnique({
    where: { userId_resourceId: { userId: user.id, resourceId: id } },
  });

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
    <div className="inner-page">
      <ResourceViewTracker resourceId={id} />
      <section className="page-hero">
        <div className="page-hero-content page-hero-content--split">
          <div>
            <Link href="/resources" className="resource-back-link">
              ← Career library
            </Link>
            <h1>{resource.title}</h1>
            <p>{resource.summary}</p>
          </div>
          <div className="page-hero-actions">
            <Link href="/dashboard/learning" className="btn btn-hero-ghost">
              Learning hub
            </Link>
            <Link href="/dashboard" className="btn btn-hero-ghost">
              Dashboard
            </Link>
            <SignOutButton className="btn btn-hero-ghost" />
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
            {resource.file && (
              <ResourceDownloadButton resourceId={id} resourceTitle={resource.title} />
            )}
          </div>
          <article className="resource-content markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
