import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import BlogListingClient from './BlogListingClient';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Workforce Development Blog | Career Tips & Training News',
  description:
    'Career tips, program spotlights, success stories, and workforce insights from Workforce Advancement Project. Career training advice, job-readiness guidance, and workforce insights for individuals nationwide.',
  path: '/blog',
});
}

export default async function BlogPage() {
  const t = await getTranslations('marketing.blog');
   
  let posts: any[] = [];
  if (!shouldSkipOptionalDbQueriesAtBuild()) {
    try {
      posts = await prisma.blogPost.findMany({
        where: {
          OR: [{ published: true }, { scheduledAt: { lte: new Date() } }],
        },
        orderBy: { publishedAt: 'desc' },
        take: 200,
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
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
      posts = [];
    }
  }

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[];

  const hasPosts = posts.length > 0;

  return (
    <div className="inner-page blog-page">
      <PageHero
        className="blog-page-hero"
        title={hasPosts ? t('blog') : t('careerResources')}
        subtitle={
          hasPosts
            ? 'Career tips, program spotlights, success stories, and local insights.'
            : 'Use programs, FAQ, and application help while new articles are being published.'
        }
      />
      <BlogListingClient posts={posts} categories={categories} />
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
