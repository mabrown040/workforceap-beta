'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AppLocale } from '@/lib/i18n/config';
import { DEFAULT_LOCALE, WAP_LOCALE_COOKIE, isAppLocale, splitLocalePrefix, withLocalePrefix } from '@/lib/i18n/config';

function readLocaleCookie(): AppLocale | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${WAP_LOCALE_COOKIE}=([^;]+)`));
  const v = m?.[1]?.trim();
  return v && isAppLocale(v) ? v : null;
}

/**
 * Active locale: URL prefix wins (e.g. /es/programs); otherwise `wap-locale` cookie;
 * otherwise default (portal paths like /dashboard are unprefixed but can still link localized).
 */
export function useLocaleFromPath(): AppLocale {
  const pathname = usePathname() ?? '/';
  const [cookieLoc, setCookieLoc] = useState<AppLocale | null>(null);

  useEffect(() => {
    setCookieLoc(readLocaleCookie());
  }, [pathname]);

  return useMemo(() => {
    const { locale } = splitLocalePrefix(pathname);
    if (locale) return locale;
    if (cookieLoc) return cookieLoc;
    return DEFAULT_LOCALE;
  }, [pathname, cookieLoc]);
}

/** Prefix a site path with the locale from the current URL (for MainNav, footers, etc.). */
export function useLocalizedHref(href: string): string {
  const locale = useLocaleFromPath();
  return useMemo(() => localizeHref(href, locale), [href, locale]);
}

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

export function parseLocaleFromPathname(pathname: string): AppLocale {
  const { locale } = splitLocalePrefix(pathname);
  return locale ?? DEFAULT_LOCALE;
}

export function setLocaleCookie(locale: AppLocale) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${WAP_LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
}

export { isAppLocale, withLocalePrefix, splitLocalePrefix };
