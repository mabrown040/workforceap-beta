'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import PortalNav from './PortalNav';

const MEMBER_PORTAL_PREFIXES = ['/dashboard', '/programs', '/apply', '/certifications', '/profile'];
const DEDICATED_SHELL_PREFIXES = ['/employer', '/partner', '/counselor'];

function isMemberPortalPath(path: string) {
  return MEMBER_PORTAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function hasDedicatedShell(path: string) {
  return DEDICATED_SHELL_PREFIXES.some((p) => path.startsWith(p));
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isDashboard = pathname.startsWith('/dashboard');
  const isPartnerPortal = pathname.startsWith('/partner');
  const isDedicatedShell = hasDedicatedShell(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect partner users away from member portal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = (await res.json()) as { partner?: { partnerId: string } | null; superAdmin?: boolean };
        if (cancelled || !data.partner) return;
        if (data.superAdmin) return;
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

  // Body scroll lock when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [sidebarOpen]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const showNav = !isDashboard && !isPartnerPortal && !isDedicatedShell;

  return (
    <>
      {showNav && (
        <>
          <button
            type="button"
            className="portal-hamburger md:hidden"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          >
            <span className="portal-hamburger-bar" />
            <span className="portal-hamburger-bar" />
            <span className="portal-hamburger-bar" />
          </button>
          {sidebarOpen && (
            <div
              className="portal-drawer-overlay open"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <PortalNav className={sidebarOpen ? 'open' : ''} />
        </>
      )}
      {children}
    </>
  );
}
