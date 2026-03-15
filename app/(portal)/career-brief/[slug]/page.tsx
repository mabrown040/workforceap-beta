import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs, getCareerBriefContent } from '@/lib/content/careerBriefs';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const briefs = getCareerBriefs();
  const brief = briefs.find((b) => b.slug === slug);
  if (!brief) return { title: 'Brief not found' };
  return buildPageMetadata({
    title: brief.title,
    description: 'Weekly Career Brief for WorkforceAP members.',
    path: `/career-brief/${slug}`,
  });
}

export default async function CareerBriefDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/career-brief');

  const { slug } = await params;
  const content = getCareerBriefContent(slug);
  if (!content) notFound();

  const briefs = getCareerBriefs();
  const brief = briefs.find((b) => b.slug === slug);

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/career-brief" className="resource-back-link">
              ← Back to Career Brief
            </Link>
            <h1>{brief?.title ?? 'Career Brief'}</h1>
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
            <ReactMarkdown
              components={{
                a: ({ href, children }) => {
                  const isInternal = href?.startsWith('/');
                  return isInternal ? (
                    <Link href={href!}>{children}</Link>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
