import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import { PROGRAMS } from '@/lib/content/programs';
import { ArrowRight, BookOpen, HelpCircle, GraduationCap } from 'lucide-react';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { OR: [{ published: true }, { scheduledAt: { lte: new Date() } }] },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return buildPageMetadata({
    title: post.title,
    description: post.excerpt ?? post.title,
    path,
    image: post.coverImage ?? undefined,
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
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });
  // Only show if published OR scheduledAt has passed
  if (!post || (!post.published && (!post.scheduledAt || post.scheduledAt > now))) notFound();

  const related = await prisma.blogPost.findMany({
    where: {
      published: true,
      id: { not: post.id },
      category: post.category ?? undefined,
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
    select: { slug: true, title: true },
  });

  // Get relevant programs based on category
  const relevantProgramSlugs = categoryProgramMap[post.category ?? ''] ?? [];
  const relevantPrograms = PROGRAMS.filter(p => relevantProgramSlugs.includes(p.slug)).slice(0, 3);

  return (
    <div className="inner-page">
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
        {post.coverImage ? (
          <div
            style={{
              marginBottom: '2rem',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
            }}
          >
            <Image
              src={post.coverImage}
              alt={`Cover image for ${post.title}`}
              width={680}
              height={383}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              marginBottom: '2rem',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <Image
              src="/images/logo-tight.png"
              alt="Workforce Advancement Project"
              width={272}
              height={153}
              style={{ width: '40%', height: 'auto', opacity: 0.9, objectFit: 'contain' }}
            />
          </div>
        )}
        <div className="blog-post-prose markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* Related Resources Section */}
        {(relevantPrograms.length > 0 || related.length > 0) && (
          <section style={{ 
            marginTop: '3rem', 
            padding: '2rem', 
            background: '#f8f9fa', 
            borderRadius: '12px',
            border: '1px solid #e5e5e5'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={22} style={{ color: '#ad2c4d' }} />
              Related Resources
            </h3>
            
            {relevantPrograms.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#666', marginBottom: '0.75rem' }}>
                  Featured Programs
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {relevantPrograms.map(program => (
                    <Link 
                      key={program.slug}
                      href={`/programs/${program.slug}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#1a1a1a',
                        border: '1px solid #e5e5e5',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <GraduationCap size={18} style={{ color: '#ad2c4d' }} />
                        {program.title}
                      </span>
                      <ArrowRight size={16} style={{ opacity: 0.5 }} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link 
                href="/faq" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#1a1a1a',
                  border: '1px solid #e5e5e5',
                  fontSize: '0.9375rem',
                }}
              >
                <HelpCircle size={18} style={{ color: '#ad2c4d' }} />
                Read FAQ
                <ArrowRight size={16} style={{ opacity: 0.5 }} />
              </Link>
              <Link 
                href="/find-your-path" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: '#ad2c4d',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'white',
                  fontSize: '0.9375rem',
                }}
              >
                Take Career Quiz
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )}

        <section className="blog-cta-section">
          <div className="blog-cta-card">
            <h3>Ready to start your career?</h3>
            <p>No-cost training for qualifying participants. Industry certifications from Google, IBM, Microsoft, and more.</p>
            <div className="blog-cta-buttons">
              <Link href="/find-your-path" className="btn btn-accent">Find Your Path</Link>
              <Link href="/apply" className="btn btn-ghost">Apply Now</Link>
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
                  <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      <Footer />
    </div>
  );
}
