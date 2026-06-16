export const APP_LOCALES = ['en', 'es', 'fr', 'pt'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

/** Cookie persisted when user picks a language (marketing + portal). */
export const WAP_LOCALE_COOKIE = 'wap-locale';

/** Middleware sets this request header so layouts/metadata can read active locale. */
export const WAP_LOCALE_HEADER = 'x-wap-locale';

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

/** RTL languages (future: ar, he, ur). Currently none. */
export const RTL_LOCALES: readonly string[] = [];

export function isRtlLocale(locale: AppLocale): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Public paths that use /{locale}/… URLs (redirect if prefix missing). */
export const LOCALEABLE_PATH_PREFIXES: readonly string[] = [
  '/',
  '/programs',
  '/apply',
  '/contact',
  '/faq',
  '/what-we-do',
  '/how-it-works',
  '/leadership',
  '/employers',
  '/partners',
  '/blog',
  '/find-your-path',
  '/program-comparison',
  '/salary-guide',
  '/wioa-qualification',
  '/terms',
  '/privacy',
  '/accessibility',
  '/login',
  '/mentor',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/partner-signup',
  '/impact',
  '/outcomes',
  '/careers',
  '/donate',
  '/lp',
];

export function isLocaleableMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  for (const prefix of LOCALEABLE_PATH_PREFIXES) {
    if (prefix === '/') continue;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/** Paths that never get a /{locale}/ redirect (API, assets, app shells). */
export function isLocaleBypassPath(pathname: string): boolean {
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/ingest')) return true;
  if (
    pathname === '/manifest.json' ||
    pathname === '/manifest-counselor.json' ||
    pathname === '/sw.js' ||
    pathname === '/robots.txt'
  )
    return true;
  if (pathname.startsWith('/images/')) return true;
  return false;
}

export function splitLocalePrefix(pathname: string): { locale: AppLocale | null; pathnameWithoutLocale: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return { locale: null, pathnameWithoutLocale: '/' };
  const first = parts[0]!;
  if (isAppLocale(first)) {
    const rest = parts.slice(1);
    return {
      locale: first,
      pathnameWithoutLocale: rest.length === 0 ? '/' : `/${rest.join('/')}`,
    };
  }
  return { locale: null, pathnameWithoutLocale: pathname };
}

export function pickLocaleFromAcceptLanguage(header: string | null): AppLocale {
  if (!header) return DEFAULT_LOCALE;
  const preferred = header
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';q=');
      const q = qPart ? parseFloat(qPart) : 1;
      return { tag: tag?.trim().toLowerCase() ?? '', q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of preferred) {
    const base = tag.split('-')[0] ?? '';
    if (isAppLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function withLocalePrefix(pathname: string, locale: AppLocale): string {
  if (pathname === '/') return `/${locale}`;
  return `/${locale}${pathname}`;
}
