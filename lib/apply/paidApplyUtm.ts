import { splitLocalePrefix } from '@/lib/i18n/config';

export const PAID_APPLY_UTM_SOURCES = [
  'google',
  'google_ads',
  'facebook_ads',
  'tiktok_ads',
] as const;

export type PaidApplyUtmSource = (typeof PAID_APPLY_UTM_SOURCES)[number];

export const UTM_SOURCE_COOKIE = 'utm_source';

/** Set by middleware when `/apply` is served as the paid-traffic variant. */
export const WAP_PAID_APPLY_HEADER = 'x-wap-paid-apply';

/** 30 days */
export const UTM_SOURCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function isPaidUtmSource(source: string | null | undefined): source is PaidApplyUtmSource {
  if (!source) return false;
  return (PAID_APPLY_UTM_SOURCES as readonly string[]).includes(source.toLowerCase());
}

type SearchParamsLike = { utm_source?: string | string[] };

export function resolvePaidApplyUtmSource(
  searchParams: SearchParamsLike,
  cookieValue?: string | null
): PaidApplyUtmSource | null {
  const fromQuery =
    typeof searchParams.utm_source === 'string'
      ? searchParams.utm_source
      : Array.isArray(searchParams.utm_source)
        ? searchParams.utm_source[0]
        : undefined;
  const candidate = (fromQuery ?? cookieValue ?? '').trim();
  if (!isPaidUtmSource(candidate)) return null;
  return candidate.toLowerCase() as PaidApplyUtmSource;
}

/** Server-only: persists the UTM source cookie. Import from `paidApplyUtm.server` instead. */
export async function persistUtmSourceCookie(value: string): Promise<void> {
  // Dynamic import so `next/headers` is never loaded in client bundles.
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.set(UTM_SOURCE_COOKIE, value.toLowerCase(), {
    path: '/',
    maxAge: UTM_SOURCE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}

export function readUtmSourceCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${UTM_SOURCE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function isPaidApplyLanding(
  pathname: string | null | undefined,
  utmSource: string | null | undefined
): boolean {
  if (!pathname || !isPaidUtmSource(utmSource)) return false;
  const { pathnameWithoutLocale } = splitLocalePrefix(pathname);
  return pathnameWithoutLocale === '/apply';
}
