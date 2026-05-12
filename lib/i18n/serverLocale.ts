import { cookies } from 'next/headers';
import type { AppLocale } from '@/lib/i18n/config';
import { DEFAULT_LOCALE, isAppLocale } from '@/lib/i18n/config';

export type WAPLocale = AppLocale;

export const LOCALE_COOKIE = 'wap-locale';

export async function getLocale(): Promise<WAPLocale> {
  const cookieStore = await cookies();
  const val = cookieStore.get(LOCALE_COOKIE)?.value;
  return val && isAppLocale(val) ? val : DEFAULT_LOCALE;
}
