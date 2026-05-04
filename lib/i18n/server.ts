import { headers } from 'next/headers';
import type { AppLocale } from '@/lib/i18n/config';
import { DEFAULT_LOCALE, WAP_LOCALE_HEADER, isAppLocale } from '@/lib/i18n/config';

export async function getRequestLocale(): Promise<AppLocale> {
  const h = await headers();
  const raw = h.get(WAP_LOCALE_HEADER);
  if (raw && isAppLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}
