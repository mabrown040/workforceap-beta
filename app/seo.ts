import type { Metadata } from 'next';
import { APP_LOCALES, DEFAULT_LOCALE, type AppLocale, withLocalePrefix } from '@/lib/i18n/config';
import { getRequestLocale } from '@/lib/i18n/server';
import { buildOgImageUrl, getSiteUrl } from '@/lib/seo/siteEnvironment';

import { DEFAULT_MARKETING_HERO_PHOTO } from '@/lib/marketing/heroPhotos';

export const SITE_URL = getSiteUrl();
export const DEFAULT_OG_IMAGE = `${SITE_URL}${DEFAULT_MARKETING_HERO_PHOTO}`;

type PageSeoInput = {
  title: string;
  description: string;
  /** Path without locale prefix (e.g. `/programs`). Canonical uses `locale`. */
  path: string;
  /** Active locale for canonical URL; defaults to English. */
  locale?: AppLocale;
  image?: string;
  robots?: { index?: boolean; follow?: boolean };
};

export type PageSeoInputWithoutLocale = Omit<PageSeoInput, 'locale'>;

/** Use from `generateMetadata()` so canonical and hreflang match the active locale (URL prefix or cookie). */
export async function buildPageMetadataAsync(input: PageSeoInputWithoutLocale): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPageMetadata({ ...input, locale });
}

function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function ogLocaleTag(locale: AppLocale): string {
  if (locale === 'en') return 'en_US';
  if (locale === 'es') return 'es_US';
  if (locale === 'fr') return 'fr_FR';
  return 'pt_BR';
}

export function buildPageMetadata({ title, description, path, locale = DEFAULT_LOCALE, image, robots }: PageSeoInput): Metadata {
  const ogImage = image ?? buildOgImageUrl(title, description);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalPath = withLocalePrefix(normalizedPath === '' ? '/' : normalizedPath, locale);
  const fullUrl = absoluteUrl(canonicalPath);
  const languageAlternates: Record<string, string> = {};
  for (const l of APP_LOCALES) {
    languageAlternates[l] = absoluteUrl(withLocalePrefix(normalizedPath === '' ? '/' : normalizedPath, l));
  }
  const meta: Metadata = {
    title,
    description,
    alternates: {
      canonical: fullUrl,
      languages: languageAlternates,
    },
    openGraph: {
      title: `${title} — Workforce Advancement Project`,
      description,
      url: fullUrl,
      siteName: 'Workforce Advancement Project | Austin, TX',
      locale: ogLocaleTag(locale),
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Workforce Advancement Project' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Workforce Advancement Project`,
      description,
      images: [ogImage],
    },
  };
  if (robots) {
    meta.robots = robots;
  }
  return meta;
}
