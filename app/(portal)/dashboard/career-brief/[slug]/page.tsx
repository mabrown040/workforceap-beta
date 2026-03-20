import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs, getCareerBriefContent } from '@/lib/content/careerBriefs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import { generatePersonalizedBriefSection } from '@/lib/ai/careerBriefAI';
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
    path: `/dashboard/career-brief/${slug}`,
  });
}

export default async function CareerBriefDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-brief');

  const { slug } = await params;
  const content = getCareerBriefContent(slug);
  if (!content) notFound();

  const briefs = getCareerBriefs();
  const brief = briefs.find((b) => b.slug === slug);

  const context = await getCareerBriefContext(user.id);
  const aiSection = await generatePersonalizedBriefSection(
    context,
    brief?.title ?? 'Weekly Career Brief'
  );

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/dashboard/career-brief" className="resource-back-link">
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
          {aiSection && (
            <div className="career-brief-ai-section">
              <h2 className="career-brief-ai-title">This Week for You</h2>
              <div className="career-brief-ai-content">
                {aiSection.split('\n\n').map((p, i) => (
                  <p key={i}>{p.trim()}</p>
                ))}
              </div>
            </div>
          )}
          <article className="resource-content markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
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
