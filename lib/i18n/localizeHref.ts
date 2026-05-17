import type { AppLocale } from '@/lib/i18n/config';
import { splitLocalePrefix, withLocalePrefix } from '@/lib/i18n/config';

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
