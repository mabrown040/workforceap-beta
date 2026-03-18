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
      where: { published: true },
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
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });
  if (!post) notFound();

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
      <article className="blog-post-article">
        {post.coverImage && (
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
        )}
        <div className="blog-post-prose markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
        <div
          style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid #eee',
          }}
        >
          <Link
            href="/apply"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--color-accent)',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Apply for a Program
          </Link>
        </div>
        {related.length > 0 && (
          <aside
            style={{
              marginTop: '3rem',
              paddingTop: '2rem',
              borderTop: '1px solid #eee',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              Related Posts
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {related.map((r) => (
                <li key={r.slug} style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={`/blog/${r.slug}`}
                    style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </article>
      <Footer />
    </div>
  );
}
