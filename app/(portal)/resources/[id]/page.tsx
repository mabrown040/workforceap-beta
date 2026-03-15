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
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/resources" className="resource-back-link">
              ← Back to resources
            </Link>
            <h1>{resource.title}</h1>
            <p>{resource.summary}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <article className="resource-content markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
