import type { MetadataRoute } from 'next';
import { PROGRAMS } from '@/lib/content/programs';

const SITE_URL = 'https://www.workforceap.org';

const routes = [
  '/',
  '/apply',
  '/contact',
  '/faq',
  '/how-it-works',
  '/leadership',
  '/program-comparison',
  '/programs',
  '/salary-guide',
  '/what-we-do',
  '/privacy',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...mainPages, ...programPages];
}
