import Link from 'next/link';
import type { ComponentProps } from 'react';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, WAP_LOCALE_HEADER, isAppLocale } from '@/lib/i18n/config';
import { localizeHref } from '@/lib/i18n/localizeHref';

type LinkProps = ComponentProps<typeof Link>;

/**
 * Locale-aware `Link` for server components (reads `x-wap-locale` from middleware).
 * Avoids shipping `usePathname` / cookie hydration for marketing pages that are otherwise static HTML.
 */
export default async function LocalizedLinkServer({ href, ...rest }: LinkProps) {
  const h = await headers();
  const raw = h.get(WAP_LOCALE_HEADER);
  const locale = raw && isAppLocale(raw) ? raw : DEFAULT_LOCALE;
  const resolved = typeof href === 'string' ? localizeHref(href, locale) : href;
  return <Link href={resolved} {...rest} />;
}
