import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { isAppLocale, DEFAULT_LOCALE } from '@/lib/i18n/config';

type MessageNode = string | string[] | { [key: string]: MessageNode };

function deepMergeMessages(
  base: Record<string, MessageNode>,
  override: Record<string, MessageNode>,
): Record<string, MessageNode> {
  const out: Record<string, MessageNode> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMergeMessages(
        existing as Record<string, MessageNode>,
        value as Record<string, MessageNode>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default getRequestConfig(async () => {
  const h = await headers();
  const raw = h.get('x-wap-locale') ?? DEFAULT_LOCALE;
  const locale = isAppLocale(raw) ? raw : DEFAULT_LOCALE;

  // Always load English as the fallback so any missing key in another locale
  // resolves to its English string instead of throwing MISSING_MESSAGE.
  const fallback = (await import('../messages/en.json')).default as Record<string, MessageNode>;
  if (locale === DEFAULT_LOCALE) {
    return { locale, messages: fallback };
  }

  const localeMessages = (await import(`../messages/${locale}.json`)).default as Record<
    string,
    MessageNode
  >;
  return {
    locale,
    messages: deepMergeMessages(fallback, localeMessages),
  };
});
