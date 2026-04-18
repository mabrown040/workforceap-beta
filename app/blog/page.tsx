import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import BlogListingClient from './BlogListingClient';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getBlogPosts, getBlogCategories } from '@/lib/content/blog';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Tips, Program Spotlights & Success Stories',
  description:
    'WorkforceAP blog: career guidance, training program updates, member success stories, and workforce development insights.',
  path: '/blog',
});

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const categories = await getBlogCategories();

  return (
    <div className="blog-page">
      <PageHero
        className="blog-page-hero"
        title="Blog"
        subtitle="Career tips, program spotlights, success stories, and local insights."
      />
      <BlogListingClient posts={posts} categories={categories} />
      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
