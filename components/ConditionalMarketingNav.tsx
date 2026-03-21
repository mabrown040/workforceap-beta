'use client';

import { usePathname } from 'next/navigation';
import MainNav from './MainNav';

const PORTAL_PREFIXES = ['/dashboard', '/admin', '/employer', '/partner', '/my-group', '/resources', '/help', '/applications', '/certifications', '/profile', '/account'];

/**
 * Renders MainNav only on public marketing routes.
 * Hidden inside any portal (one-shell rule) so portal nav is the only chrome.
 */
export default function ConditionalMarketingNav() {
  const pathname = usePathname();
  const isPortal = PORTAL_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
  if (isPortal) return null;
  return <MainNav />;
}
