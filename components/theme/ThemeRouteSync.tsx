'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isMarketingChromeHidden } from '@/lib/nav/marketing-chrome';

/**
 * Dark mode is a portal-only feature; the public marketing site is light-locked.
 * ThemeInitScript handles the first paint (no FOUC); this keeps client-side
 * (SPA) navigation correct: marketing routes force light, portal routes re-apply
 * the user's stored preference. The `wap-theme` localStorage value is never
 * cleared, so the portal toggle keeps working across navigation.
 */
export default function ThemeRouteSync() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const isPortal = isMarketingChromeHidden(pathname);
    if (!isPortal) {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      return;
    }
    try {
      const theme = localStorage.getItem('wap-theme');
      if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        root.removeAttribute('data-theme');
      }
    } catch {
      /* no-op */
    }
  }, [pathname]);
  return null;
}
