import Link from 'next/link';
import type { ComponentProps } from 'react';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, WAP_LOCALE_HEADER, isAppLocale } from '@/lib/i18n/config';
import { resolveLocalizedHref } from '@/lib/i18n/localizeHref';

type LinkProps = ComponentProps<typeof Link>;

const NEXT_LINK_ONLY_PROPS = [
  'prefetch',
  'replace',
  'scroll',
  'shallow',
  'passHref',
  'legacyBehavior',
  'locale',
  'onNavigate',
] as const;

function toDocumentAnchorProps(props: Omit<LinkProps, 'href' | 'children'>): ComponentProps<'a'> {
  const anchorProps = { ...props } as Record<string, unknown>;
  for (const prop of NEXT_LINK_ONLY_PROPS) delete anchorProps[prop];
  return anchorProps as ComponentProps<'a'>;
}

/**
 * Locale-aware `Link` for server components (reads `x-wap-locale` from middleware).
 * Avoids shipping `usePathname` / cookie hydration for marketing pages that are otherwise static HTML.
 */
export default async function LocalizedLinkServer({ href, children, ...rest }: LinkProps) {
  const h = await headers();
  const raw = h.get(WAP_LOCALE_HEADER);
  const locale = raw && isAppLocale(raw) ? raw : DEFAULT_LOCALE;
  if (typeof href === 'string') {
    const resolved = resolveLocalizedHref(href, locale);
    if (resolved.useDocumentNavigation) {
      return <a href={resolved.href} {...toDocumentAnchorProps(rest)}>{children}</a>;
    }
    return <Link href={resolved.href} {...rest}>{children}</Link>;
  }
  return <Link href={href} {...rest}>{children}</Link>;
}
