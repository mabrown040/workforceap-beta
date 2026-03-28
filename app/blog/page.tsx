import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import BlogListingClient from './BlogListingClient';
import MainNav from '@/components/MainNav';

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: 'Stories & Insights | Workforce Advancement Project',
  description:
    'Career tips, program spotlights, success stories, and Austin workforce insights from Workforce Advancement Project.',
  path: '/blog',
});

export default async function BlogPage() {
  let posts: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    heroImage: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    category: string | null;
  }[] = [];

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
    <div className="wa-min-h-screen wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Editorial</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Stories &amp;{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Insights
            </span>
          </h1>
          <p className="wa-text-xl wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Career tips, program spotlights, and workforce insights to help you move forward.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-6xl wa-mx-auto">
          {posts.length > 0 ? (
            <BlogListingClient posts={posts} categories={categories} />
          ) : (
            <div className="wa-max-w-xl wa-mx-auto wa-text-center wa-py-16">
              <div className="wa-bg-gray-50 dark:wa-bg-[#1e1d1d] wa-border wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.3)] wa-rounded-2xl wa-p-12">
                <p className="wa-text-4xl wa-mb-4">✍️</p>
                <h2 className="wa-text-2xl wa-font-bold wa-mb-3">Coming Soon</h2>
                <p className="wa-text-gray-500 dark:wa-text-[#b8a5a7] wa-mb-8">
                  Our editorial team is working on stories and insights. Subscribe to get notified when we publish.
                </p>
                <form
                  action="/api/subscribe"
                  method="POST"
                  className="wa-flex wa-flex-col sm:wa-flex-row wa-gap-3"
                >
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    className="wa-flex-1 wa-px-4 wa-py-3 wa-rounded-lg wa-border wa-border-gray-300 dark:wa-border-[rgba(88,65,68,0.4)] wa-bg-white dark:wa-bg-[#2b2a2a] wa-text-gray-900 dark:wa-text-[#e6e1e1] wa-outline-none focus:wa-border-[#ad2c4d]"
                  />
                  <button
                    type="submit"
                    className="wa-px-6 wa-py-3 wa-bg-[#ad2c4d] wa-text-white wa-font-bold wa-rounded-lg hover:wa-bg-[#8b1f38] wa-transition-colors wa-whitespace-nowrap"
                  >
                    Notify Me
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
