import { DEFAULT_LOCALE, WAP_LOCALE_COOKIE, type AppLocale, isAppLocale } from '@/lib/i18n/config';

type CookieStoreLike = { get(name: string): { value: string } | undefined };

/** Resolve member-facing locale from cookies (`wap-locale` preferred, then legacy `i18next`). */
export function getAppLocaleFromCookieStore(cookieStore: CookieStoreLike): AppLocale {
  const fromWap = cookieStore.get(WAP_LOCALE_COOKIE)?.value;
  if (fromWap && isAppLocale(fromWap)) return fromWap;
  const legacy = cookieStore.get('i18next')?.value?.split('-')[0];
  if (legacy && isAppLocale(legacy)) return legacy;
  return DEFAULT_LOCALE;
}
