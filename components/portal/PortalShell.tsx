'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import PortalNav from './PortalNav';
import PortalRoleSwitcher from './PortalRoleSwitcher';
import type { PortalRole } from '@/lib/nav/portalNav';

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
  const [userRoles, setUserRoles] = useState<{ role: PortalRole; roleLabel: string; homeHref: string }[]>([]);
  const [currentRole, setCurrentRole] = useState<PortalRole>('member');

  // Fetch user roles and determine current portal
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json() as {
          partner?: { partnerId: string } | null;
          employer?: { employerId: string } | null;
          counselor?: { counselorId: string } | null;
          superAdmin?: boolean;
        };
        
        if (cancelled) return;
        
        const roles: { role: PortalRole; roleLabel: string; homeHref: string }[] = [];
        
        // Determine current portal based on pathname
        let current: PortalRole = 'member';
        if (pathname.startsWith('/employer')) current = 'employer';
        else if (pathname.startsWith('/partner')) current = 'partner';
        else if (pathname.startsWith('/counselor')) current = 'counselor';
        else if (pathname.startsWith('/admin')) current = 'admin';
        
        // Build available roles list
        if (data.employer) {
          roles.push({ role: 'employer', roleLabel: 'Employer', homeHref: '/employer' });
        }
        if (data.partner) {
          roles.push({ role: 'partner', roleLabel: 'Partner', homeHref: '/partner' });
        }
        if (data.counselor) {
          roles.push({ role: 'counselor', roleLabel: 'Counselor', homeHref: '/counselor' });
        }
        if (data.superAdmin) {
          roles.push({ role: 'admin', roleLabel: 'Admin', homeHref: '/admin' });
        }
        
        // Always include member portal so multi-role users can switch back.
        if (!roles.some((r) => r.role === 'member')) {
          roles.unshift({ role: 'member', roleLabel: 'Member', homeHref: '/dashboard' });
        }

        setUserRoles(roles);
        setCurrentRole(current);
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
      const scrollY = window.scrollY;
      document.body.classList.add('sidebar-open');
      document.body.style.top = `-${scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';
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
  const showRoleSwitcher = userRoles.length > 1;

  return (
    <>
      {showNav && (
        <>
          {showRoleSwitcher && (
            <PortalRoleSwitcher userRoles={userRoles} currentRole={currentRole} />
          )}
          <button
            type="button"
            className="portal-hamburger md:wa-hidden"
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
          <PortalNav 
            className={sidebarOpen ? 'open' : ''} 
            currentRole={currentRole}
            currentPath={pathname}
          />
        </>
      )}
      {children}
    </>
  );
}
