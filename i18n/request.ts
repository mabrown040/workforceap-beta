import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { isAppLocale } from '@/lib/i18n/config';

export default getRequestConfig(async () => {
  const h = await headers();
  const raw = h.get('x-wap-locale') ?? 'en';
  const locale = isAppLocale(raw) ? raw : 'en';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
