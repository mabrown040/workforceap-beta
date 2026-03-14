import type { MetadataRoute } from 'next';

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
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }));
}
