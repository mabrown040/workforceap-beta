import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { captureApiError } from '@/lib/observability/captureApiError';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { PROGRAMS } from '@/lib/content/programs';
import { ArrowRight } from 'lucide-react';
import { getDefaultImage } from '@/lib/blog/defaultImages';
import { resolveBlogHeroImage } from '@/lib/blog/blogHeroImage';
import JsonLdArticle from '@/components/JsonLdArticle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  if (shouldSkipOptionalDbQueriesAtBuild()) return [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { OR: [{ published: true }, { scheduledAt: { lte: new Date() } }] },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch (error) {
    captureApiError(error, { route: 'blog/[slug] generateStaticParams' });
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const now = new Date();
  if (shouldSkipOptionalDbQueriesAtBuild()) return {};
  let post = null;
  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
    });
  } catch (error) {
    captureApiError(error, { route: 'blog/[slug] generateMetadata', extra: { slug } });
    post = null;
  }
  if (!post || (!post.published && (!post.scheduledAt || post.scheduledAt > now))) return {};
  const path = `/blog/${post.slug}`;
  const defImg = getDefaultImage(post.category, post.slug);
  return buildPageMetadataAsync({
    title: post.title,
    description: post.excerpt ?? post.title,
    path,
    image: post.coverImage?.trim() || defImg.url,
  });
}

// Map blog categories to relevant programs
const categoryProgramMap: Record<string, string[]> = {
  'Career Tips': ['project-management-professional-pmp', 'it-support-professional-certificate-google'],
  'Program Spotlights': ['cybersecurity-professional-certificate-google', 'aws-cloud-practitioner', 'comptia-a'],
  'Success Stories': ['data-analytics-professional-certificate-google', 'ai-engineering-professional-certificate-ibm'],
  'Industry Insights': ['comptia-security', 'google-project-management-certificate'],
  'Healthcare': ['medical-coding-and-billing-specialist', 'certified-clinical-medical-assistant'],
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const now = new Date();
  if (shouldSkipOptionalDbQueriesAtBuild()) notFound();
  let post = null;
  try {
    post = await prisma.blogPost.findUnique({
      where: { slug },
    });
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    post = null;
  }
  // Only show if published OR scheduledAt has passed
  if (!post || (!post.published && (!post.scheduledAt || post.scheduledAt > now))) notFound();

  let related: { slug: string; title: string }[] = [];
  try {
    related = await prisma.blogPost.findMany({
      where: {
        published: true,
        id: { not: post.id },
        category: post.category ?? undefined,
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    });
  } catch (error) {
    console.error('Failed to fetch related posts:', error);
    related = [];
  }

  // Get relevant programs based on category
  const relevantProgramSlugs = categoryProgramMap[post.category ?? ''] ?? [];
  const relevantPrograms = PROGRAMS.filter(p => relevantProgramSlugs.includes(p.slug)).slice(0, 3);

  return (
    <div className="inner-page blog-post-page">
      <JsonLdArticle post={post} />
      <PageHero
        title={post.title}
        subtitle={[
          post.category,
          post.authorName,
          post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <div className="blog-post-layout">
        <article className="blog-post-article">
        <LocalizedLink href="/blog" className="blog-back-link">
          ← Back to Blog
        </LocalizedLink>
        {(() => {
          const hero = resolveBlogHeroImage(post.coverImage, post.category, post.slug);
          return (
            <div
              style={{
                marginBottom: '2rem',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '16/9',
              }}
            >
              <Image
                src={hero.src}
                alt={hero.alt}
                width={680}
                height={383}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          );
        })()}
        <div className="blog-post-prose markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* Related Resources Section */}
        {(relevantPrograms.length > 0 || related.length > 0) && (
          <section style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'var(--surface-container-low)',
            borderRadius: '12px',
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--color-accent)' }} aria-hidden="true">menu_book</span>
              Related Resources
            </h3>
            
            {relevantPrograms.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
                  Featured Programs
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {relevantPrograms.map(program => (
                    <LocalizedLink
                      key={program.slug}
                      href={`/programs/${program.slug}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'var(--surface-container)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">school</span>
                        {program.title}
                      </span>
                      <ArrowRight size={16} style={{ opacity: 0.5 }} />
                    </LocalizedLink>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <LocalizedLink
                href="/faq"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--surface-container)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.9375rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }} aria-hidden="true">help</span>
                Read FAQ
                <ArrowRight size={16} style={{ opacity: 0.5 }} />
              </LocalizedLink>
              <LocalizedLink
                href="/find-your-path"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--color-accent)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'white',
                  fontSize: '0.9375rem',
                }}
              >
                Take Career Quiz
                <ArrowRight size={16} />
              </LocalizedLink>
            </div>
          </section>
        )}

        <section className="blog-cta-section">
          <div className="blog-cta-card">
            <h3>Ready to take the next step?</h3>
            <p>WorkforceAP offers no-cost career training paths for <LocalizedLink href="/apply" style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}>qualifying members</LocalizedLink> — with guided tools, advisor support, and employer-aligned credentials.</p>
            <div className="blog-cta-buttons">
              <LocalizedLink href="/find-your-path" className="btn btn-primary btn-radius-md">
                Find Your Path
              </LocalizedLink>
              <LocalizedLink href="/programs" className="btn btn-secondary btn-radius-md">
                Explore Programs
              </LocalizedLink>
              <LocalizedLink href="/apply" className="btn btn-ghost btn-radius-md">
                Apply Now
              </LocalizedLink>
            </div>
          </div>
        </section>
        </article>
        {related.length > 0 && (
          <aside className="blog-post-related">
            <h3>Related Posts</h3>
            <ul>
              {related.map((r) => (
                <li key={r.slug}>
                  <LocalizedLink href={`/blog/${r.slug}`}>{r.title}</LocalizedLink>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
