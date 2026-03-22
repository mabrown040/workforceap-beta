'use client';

import { usePathname } from 'next/navigation';
import PortalNav from './PortalNav';

const DEDICATED_SHELL_PREFIXES = ['/employer', '/partner', '/my-group'];

function hasDedicatedShell(path: string) {
  return DEDICATED_SHELL_PREFIXES.some((p) => path.startsWith(p));
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isDashboard = pathname.startsWith('/dashboard');
  const isPartnerPortal = pathname.startsWith('/partner');
  const isDedicatedShell = hasDedicatedShell(pathname);

  return (
    <>
      {!isDashboard && !isPartnerPortal && !isDedicatedShell && <PortalNav />}
      {children}
    </>
  );
}
