import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import BlogListingClient from './BlogListingClient';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';

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
        OR: [{ published: true }, { scheduledAt: { lte: new Date() } }],
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
  const featured = posts[0];

  return (
    <StitchPage>
      <StitchHero
        badge="Editorial"
        title={
          <>
            Stories, guidance, and
            <br />
            <span className="stitch-title-highlight">career intelligence</span>
          </>
        }
        description="The blog no longer reads as a bare leftover route. Listing, featured story treatment, cards, and CTAs now match the Stitch marketing shell."
        actions={
          <>
            <Link href="/find-your-path" className="btn btn-primary">Take the career quiz</Link>
            <Link href="/programs" className="btn btn-outline">Browse programs</Link>
          </>
        }
        aside={
          featured ? (
            <Link href={`/blog/${featured.slug}`} className="stitch-surface stitch-quick-link wa-flex-col wa-items-start">
              <div className="wa-relative wa-overflow-hidden wa-rounded-[22px] wa-w-full">
                <Image
                  src={featured.heroImage || featured.coverImage || '/og-image.png'}
                  alt={featured.title}
                  width={960}
                  height={540}
                  className="wa-w-full wa-h-auto wa-object-cover"
                />
              </div>
              <div className="stitch-kicker wa-mt-4">Featured Story</div>
              <h2 className="wa-text-3xl wa-font-bold wa-leading-tight wa-mt-2">{featured.title}</h2>
              <p className="wa-mt-3">{featured.excerpt ?? 'Read the latest WorkforceAP insight.'}</p>
            </Link>
          ) : undefined
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-3">
          <div className="stitch-card stitch-stat-card"><strong>{posts.length || '0'}</strong><span>Published stories</span></div>
          <div className="stitch-card stitch-stat-card"><strong>{categories.length || '0'}</strong><span>Active categories</span></div>
          <div className="stitch-card stitch-stat-card"><strong>Austin</strong><span>Local workforce framing</span></div>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-surface">
          {posts.length > 0 ? (
            <BlogListingClient posts={featured ? posts.slice(1) : posts} categories={categories} />
          ) : (
            <div className="stitch-cta-band wa-text-center">
              <div className="stitch-kicker">Coming Soon</div>
              <h2>Editorial is being rebuilt on the same premium system</h2>
              <p>Our team is working on stories and insights. Subscribe to get notified when we publish.</p>
              <form action="/api/subscribe" method="POST" className="stitch-actions wa-justify-center">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="job-search-input wa-min-w-[280px]"
                />
                <button type="submit" className="btn btn-primary">Notify Me</button>
              </form>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
