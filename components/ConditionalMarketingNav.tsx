'use client';

import { usePathname } from 'next/navigation';
import { isMarketingChromeHidden } from '@/lib/nav/marketing-chrome';
import TopBanner from './TopBanner';
import MainNav from './MainNav';

/** Top banner + main nav on public marketing routes only — portals keep a single shell. */
export default function ConditionalMarketingNav() {
  const pathname = usePathname();
  if (isMarketingChromeHidden(pathname)) return null;
  return (
    <>
      <TopBanner />
      <MainNav />
    </>
  );
}
