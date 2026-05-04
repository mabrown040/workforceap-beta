import { splitLocalePrefix } from '@/lib/i18n/config';

/**
 * Paths that use their own shell (no marketing TopBanner / MainNav).
 * Keep in sync with any new portal or app prefixes.
 */
const HIDE_MARKETING_CHROME_PREFIXES = [
  '/dashboard',
  '/admin',
  '/employer',
  '/partner',
  '/counselor',
  '/resources',
  '/help',
  '/applications',
  '/certifications',
  '/profile',
  '/account',
] as const;

export function isMarketingChromeHidden(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const { pathnameWithoutLocale } = splitLocalePrefix(pathname);
  return HIDE_MARKETING_CHROME_PREFIXES.some(
    (p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`)
  );
}
