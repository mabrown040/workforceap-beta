'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { getBestActiveHref } from '@/lib/nav/activeRoute';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import PortalHeaderActions from './PortalHeaderActions';
import { SignOutButton } from './SignOutButton';

export type WorkspaceNavLink = { href: string; label: string };

export default function WorkspaceShell({
  navLinks,
  workspaceLabel,
  contextLabel,
  superAdmin,
  superAdminBackHref,
  superAdminBackLabel,
  children,
}: {
  navLinks: WorkspaceNavLink[];
  workspaceLabel: string;
  contextLabel: string;
  superAdmin?: boolean;
  superAdminBackHref?: string;
  superAdminBackLabel?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const activeHref = getBestActiveHref(pathname, navLinks);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const trapRef = useFocusTrap(drawerOpen, closeDrawer);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.inert = drawerOpen;
    return () => {
      el.inert = false;
    };
  }, [drawerOpen]);

  return (
    <div className="workspace-shell-root">
      <header className="workspace-shell-header">
        <div className="workspace-shell-header__brand">
          <button
            type="button"
            className="workspace-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
          <div className="workspace-shell-brand-block">
            <Link href={navLinks[0]?.href ?? '/'} className="workspace-shell-brand">
              WorkforceAP
            </Link>
            <span className="workspace-shell-tagline">{workspaceLabel}</span>
          </div>
        </div>
        <div className="workspace-shell-header__meta">
          <span className="workspace-shell-context" title={contextLabel}>
            {contextLabel}
          </span>
          <PortalHeaderActions />
        </div>
      </header>

      {superAdmin && superAdminBackHref && (
        <div className="workspace-super-admin-banner">
          Viewing as <strong>{contextLabel}</strong>.{' '}
          <Link href={superAdminBackHref}>{superAdminBackLabel ?? 'Switch'}</Link>
        </div>
      )}

      <div
        className={`workspace-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={closeDrawer}
        onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
        role="button"
        tabIndex={-1}
        aria-hidden
      />

      <div className="workspace-shell-body">
        <aside
          ref={trapRef}
          className={`workspace-sidebar ${drawerOpen ? 'open' : ''}`}
        >
          <div className="workspace-sidebar-inner">
            <div className="workspace-sidebar-label">{workspaceLabel}</div>
            <nav aria-label={`${workspaceLabel} navigation`} className="workspace-sidebar-nav">
              <ul className="workspace-sidebar-list">
                {navLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`workspace-sidebar-link${activeHref === href ? ' active' : ''}`}
                      onClick={closeDrawer}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="workspace-sidebar-footer">
              <div className="workspace-sidebar-meta">
                <span className="workspace-sidebar-context" title={contextLabel}>
                  {contextLabel}
                </span>
                <SuperAdminViewSwitcher />
              </div>
              <Link href="/" className="workspace-sidebar-home-link" onClick={closeDrawer}>
                Site home
              </Link>
              <SignOutButton className="workspace-sidebar-signout" onSignOutStart={closeDrawer}>
                Sign out
              </SignOutButton>
            </div>
          </div>
        </aside>

        <main ref={mainRef} className="workspace-shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}
