'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useLocaleFromPath } from '@/lib/i18n/client';
import { localizeHref } from '@/lib/i18n/localizeHref';

type LinkProps = ComponentProps<typeof Link>;

/** Same as Next `Link` but prefixes `href` with the active locale when appropriate. */
export default function LocalizedLink({ href, ...rest }: LinkProps) {
  const locale = useLocaleFromPath();
  const resolved =
    typeof href === 'string' ? localizeHref(href, locale) : href;
  return <Link href={resolved} {...rest} />;
}
