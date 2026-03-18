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
              alt=""
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
              alt=""
              width={272}
              height={153}
              style={{ width: '40%', height: 'auto', opacity: 0.9, objectFit: 'contain' }}
            />
          </div>
        )}
        <div className="blog-post-prose markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
        <section className="blog-post-cta-section">
          <h3>Ready to start your career?</h3>
          <p>No-cost training for qualifying participants.</p>
          <Link href="/apply" className="btn btn-primary">
            Apply for a Program
          </Link>
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
