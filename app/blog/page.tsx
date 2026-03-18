import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import BlogListingClient from './BlogListingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Blog',
  description:
    'Career tips, program spotlights, success stories, and local insights from the Workforce Advancement Project.',
  path: '/blog',
});

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      authorName: true,
      publishedAt: true,
      category: true,
    },
  });

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div className="inner-page">
      <PageHero
        title="Blog"
        subtitle="Career tips, program spotlights, success stories, and local insights."
      />
      <BlogListingClient posts={posts} categories={categories} />
      <Footer />
    </div>
  );
}
