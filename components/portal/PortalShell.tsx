'use client';

import { usePathname } from 'next/navigation';
import PortalNav from './PortalNav';

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <>
      {!isDashboard && <PortalNav />}
      {children}
    </>
  );
}
