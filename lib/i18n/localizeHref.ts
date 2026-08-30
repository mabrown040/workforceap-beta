import type { AppLocale } from '@/lib/i18n/config';
import { isAstroMarketingPath, splitLocalePrefix, withLocalePrefix } from '@/lib/i18n/config';

export type LocalizedHrefResolution = {
  href: string;
  useDocumentNavigation: boolean;
};

/** Pure href localization — safe for server components (no React hooks). */
export function localizeHref(href: string, locale: AppLocale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (href.startsWith('/api') || href.startsWith('/_next')) return href;
  const q = href.includes('?') ? href.slice(href.indexOf('?')) : '';
  const pathOnly = q ? href.slice(0, href.indexOf('?')) : href;
  const { locale: existing } = splitLocalePrefix(pathOnly);
  if (existing) return href;
  const prefixed = withLocalePrefix(pathOnly === '' ? '/' : pathOnly, locale);
  return `${prefixed}${q}`;
}

/** Resolve a localized URL and identify links that cross into the Astro app. */
export function resolveLocalizedHref(href: string, locale: AppLocale): LocalizedHrefResolution {
  const resolved = localizeHref(href, locale);
  const suffixIndex = href.search(/[?#]/);
  const pathOnly = suffixIndex === -1 ? href : href.slice(0, suffixIndex);

  return {
    href: resolved,
    useDocumentNavigation: pathOnly.startsWith('/') && !pathOnly.startsWith('//') && isAstroMarketingPath(pathOnly),
  };
}
