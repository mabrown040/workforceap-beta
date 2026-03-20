'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import PortalNav from './PortalNav';

const MEMBER_PORTAL_PREFIXES = [
  '/dashboard',
  '/resources',
  '/help',
  '/applications',
  '/certifications',
  '/profile',
  '/account',
];

function isMemberPortalPath(path: string) {
  return MEMBER_PORTAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isDashboard = pathname.startsWith('/dashboard');
  const isPartnerPortal = pathname.startsWith('/partner');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = (await res.json()) as { partner?: { partnerId: string } | null };
        if (cancelled || !data.partner) return;
        if (pathname.startsWith('/partner')) return;
        if (isMemberPortalPath(pathname)) {
          window.location.replace('/partner');
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      {!isDashboard && !isPartnerPortal && <PortalNav />}
      {children}
    </>
  );
}
