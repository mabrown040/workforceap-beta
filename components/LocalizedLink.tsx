'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useLocaleFromPath } from '@/lib/i18n/client';
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

/** Same as Next `Link` but prefixes `href` with the active locale when appropriate. */
export default function LocalizedLink({ href, children, ...rest }: LinkProps) {
  const locale = useLocaleFromPath();
  if (typeof href === 'string') {
    const resolved = resolveLocalizedHref(href, locale);
    if (resolved.useDocumentNavigation) {
      return <a href={resolved.href} {...toDocumentAnchorProps(rest)}>{children}</a>;
    }
    return <Link href={resolved.href} {...rest}>{children}</Link>;
  }
  return <Link href={href} {...rest}>{children}</Link>;
}
