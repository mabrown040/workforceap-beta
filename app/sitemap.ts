import type { MetadataRoute } from 'next';
import { PROGRAMS } from '@/lib/content/programs';
import { LEADERS } from '@/lib/content/leadership';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

const SITE_URL = 'https://www.workforceap.org';

/**
 * Locales whose URL prefixes should appear in `alternates.languages` per
 * sitemap entry (cursor audit item 14). The default locale's URL is the
 * canonical (un-prefixed) form; alternates inform Google which other
 * URLs serve the same content in another language. Stay aligned with
 * the picker in `components/portal/LanguageToggle.tsx`.
 */
const SITEMAP_LOCALES: { code: string; prefix: string }[] = [
  { code: 'en', prefix: '' },
  { code: 'es', prefix: '/es' },
  { code: 'fr', prefix: '/fr' },
  { code: 'pt', prefix: '/pt' },
];

function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const { code, prefix } of SITEMAP_LOCALES) {
    languages[code] = `${SITE_URL}${prefix}${path}`;
  }
  // x-default points at the canonical (default-locale) URL so search
  // engines have a fallback for unrecognized locales.
  languages['x-default'] = `${SITE_URL}${path}`;
  return { languages };
}

export const dynamic = 'force-dynamic';

const routes = [
  '/',
  '/apply',
  '/blog',
  '/contact',
  '/employers',
  '/employers/signup',
  '/faq',
  '/find-your-path',
  '/how-it-works',
  '/impact',
  '/leadership',
  '/partners',
  '/program-comparison',
  '/programs',
  '/salary-guide',
  '/terms',
  '/what-we-do',
  '/wioa-qualification',
  '/privacy',
  '/mentor',
  '/mentor/apply',
  '/accessibility',
  '/outcomes',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const mainPages = routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: path === '/' ? 1 : 0.8,
    alternates: buildAlternates(path),
  }));

  const programPages = PROGRAMS.map((p) => ({
    url: `${SITE_URL}/programs/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: buildAlternates(`/programs/${p.slug}`),
  }));

  let blogPages: MetadataRoute.Sitemap = [];
  if (!shouldSkipOptionalDbQueriesAtBuild()) {
    try {
      const blogPosts = await prisma.blogPost.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        take: 1000,
      });
      blogPages = blogPosts.map((p) => ({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: buildAlternates(`/blog/${p.slug}`),
      }));
    } catch {
      // DB unavailable at build/runtime.
    }
  }

  const leadershipPages = LEADERS.map((l) => ({
    url: `${SITE_URL}/leadership/${l.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: buildAlternates(`/leadership/${l.slug}`),
  }));

  return [...mainPages, ...programPages, ...leadershipPages, ...blogPages];
}
