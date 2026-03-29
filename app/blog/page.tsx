import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import BlogListingClient from './BlogListingClient';
import BlogMobileSection from './BlogMobileSection';

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: 'Workforce Development Blog | Career Tips & Training News',
  description:
    'Career tips, program spotlights, success stories, and workforce insights from Workforce Advancement Project. Free tech and career training advice for career-ready individuals nationwide.',
  path: '/blog',
});

export default async function BlogPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: {
        OR: [
          { published: true },
          { scheduledAt: { lte: new Date() } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        heroImage: true,
        authorName: true,
        publishedAt: true,
        scheduledAt: true,
        category: true,
      },
    });
  } catch {
    posts = [];
  }

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div className="inner-page">
      {/* Mobile view ≤640px */}
      <BlogMobileSection posts={posts} categories={categories} />

      {/* Desktop view >640px */}
      <div className="wa-hidden wa-md:block">
        <PageHero
          title="Blog"
          subtitle="Career tips, program spotlights, success stories, and local insights."
        />
        <BlogListingClient posts={posts} categories={categories} />
        <Footer />
      </div>
    </div>
  );
}
