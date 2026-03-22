import type { MetadataRoute } from 'next';
import { PROGRAMS } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';

const SITE_URL = 'https://www.workforceap.org';

export const dynamic = 'force-dynamic';

const routes = [
  '/',
  '/apply',
  '/blog',
  '/contact',
  '/employers',
  '/faq',
  '/find-your-path',
  '/how-it-works',
  '/jobs',
  '/leadership',
  '/program-comparison',
  '/programs',
  '/salary-guide',
  '/what-we-do',
  '/privacy',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const mainPages = routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '/' ? 1 : 0.8,
  }));

  const programPages = PROGRAMS.map((p) => ({
    url: `${SITE_URL}/programs/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const blogPosts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogPages = blogPosts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time (e.g. CI)
  }

  return [...mainPages, ...programPages, ...blogPages];
}
