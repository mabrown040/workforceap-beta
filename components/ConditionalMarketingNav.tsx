'use client';

import { usePathname } from 'next/navigation';
import MainNav from './MainNav';

/**
 * Renders MainNav only on public marketing routes.
 * Hidden on /dashboard/* and /admin/* to avoid dual nav bars.
 * (Announcement bar removed per UX sprint — nav handles discovery.)
 */
export default function ConditionalMarketingNav() {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  if (isPortal) return null;
  return <MainNav />;
}
