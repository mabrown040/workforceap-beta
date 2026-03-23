'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { getBestActiveHref, isActiveRoute } from '@/lib/nav/activeRoute';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import {
  type PortalNavItem,
  type PortalRole,
  type NavBadgeKey,
  NAV_GROUP_LABELS,
  GROUP_ORDER,
  navItemsForActiveRoute,
  badgeTotalForItem,
} from '@/lib/nav/portalNav';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import PortalHeaderActions from './PortalHeaderActions';
import { SignOutButton } from './SignOutButton';

export default function WorkspaceShell({
  portalRole,
  navItems,
  workspaceLabel,
  contextLabel,
  superAdmin,
  superAdminBackHref,
  superAdminBackLabel,
  topBanner,
  footer,
  headerBadge,
  children,
}: {
  portalRole: PortalRole;
  navItems: PortalNavItem[];
  workspaceLabel: string;
  contextLabel: string;
  superAdmin?: boolean;
  superAdminBackHref?: string;
  superAdminBackLabel?: string;
  topBanner?: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional pill next to context (e.g. Hiring Partner tier) */
  headerBadge?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const activeHref = getBestActiveHref(pathname, navItemsForActiveRoute(navItems));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [wide, setWide] = useState(false);
  const [badges, setBadges] = useState<Partial<Record<NavBadgeKey, number>>>({});
  const mainRef = useRef<HTMLElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const trapRef = useFocusTrap(drawerOpen, closeDrawer);

  const collapseKey = `wa_nav_collapsed_${portalRole}`;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.inert = drawerOpen;
    return () => {
      el.inert = false;
    };
  }, [drawerOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setWide(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(collapseKey) === '1');
    } catch {
      /* ignore */
    }
  }, [collapseKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/portal/nav-badges?role=${encodeURIComponent(portalRole)}`, {
          credentials: 'include',
        });
        if (!r.ok) return;
        const data = (await r.json()) as Partial<Record<NavBadgeKey, number>>;
        if (!cancelled) setBadges(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portalRole]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(collapseKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isCollapsedDesktop = collapsed && wide;
  const firstHref = navItems[0]?.href ?? '/';

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
            <Link href={firstHref} className="workspace-shell-brand">
              WorkforceAP
            </Link>
            <span className="workspace-shell-tagline">{workspaceLabel}</span>
          </div>
        </div>
        <div className="workspace-shell-header__meta">
          <span className="workspace-shell-context workspace-shell-context--chip" title={contextLabel}>
            {contextLabel}
          </span>
          {headerBadge ? (
            <span className="workspace-shell-tier-badge" title={headerBadge}>
              {headerBadge}
            </span>
          ) : null}
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
          className={`workspace-sidebar ${drawerOpen ? 'open' : ''} ${isCollapsedDesktop ? 'workspace-sidebar--collapsed' : ''}`}
        >
          <div className="workspace-sidebar-inner">
            <div className="workspace-sidebar-toolbar">
              <div className="workspace-sidebar-label">{workspaceLabel}</div>
              {wide ? (
                <button
                  type="button"
                  className="workspace-sidebar-collapse-btn"
                  onClick={toggleCollapse}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
                </button>
              ) : null}
            </div>
            <nav aria-label={`${workspaceLabel} navigation`} className="workspace-sidebar-nav">
              <ul className="workspace-sidebar-list workspace-sidebar-list--root">
                {GROUP_ORDER.map((group) => {
                  const inGroup = navItems.filter((i) => i.group === group);
                  if (inGroup.length === 0) return null;
                  const groupLabel = NAV_GROUP_LABELS[group];
                  return (
                    <li key={group} className="workspace-sidebar-group">
                      {groupLabel && !isCollapsedDesktop ? (
                        <div className="workspace-sidebar-group-label">{groupLabel}</div>
                      ) : null}
                      <ul className="workspace-sidebar-list">
                        {inGroup.map((item) => {
                          const isActive =
                            activeHref === item.href ||
                            isActiveRoute(pathname, item.href, item.aliases ?? []);
                          const Icon = item.Icon;
                          const b = badgeTotalForItem(badges, item);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`workspace-sidebar-link${isActive ? ' active' : ''}`}
                                onClick={closeDrawer}
                                title={isCollapsedDesktop ? item.label : undefined}
                              >
                                {Icon ? (
                                  <span className="workspace-sidebar-icon" aria-hidden>
                                    <Icon size={20} className="text-current" />
                                  </span>
                                ) : null}
                                <span
                                  className={`workspace-sidebar-link-label${isCollapsedDesktop ? ' sr-only' : ''}`}
                                >
                                  {item.label}
                                </span>
                                {b > 0 ? (
                                  <span className="workspace-nav-badge">{b > 99 ? '99+' : b}</span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="workspace-sidebar-footer">
              <div className="workspace-sidebar-meta">
                <span
                  className={`workspace-sidebar-context workspace-sidebar-context--chip${isCollapsedDesktop ? ' sr-only' : ''}`}
                  title={contextLabel}
                >
                  {contextLabel}
                </span>
                <SuperAdminViewSwitcher />
              </div>
              <Link href="/" className="workspace-sidebar-home-link" onClick={closeDrawer}>
                {PRODUCT_COPY.publicSiteLabel}
              </Link>
              <SignOutButton className="workspace-sidebar-signout" onSignOutStart={closeDrawer}>
                Sign out
              </SignOutButton>
            </div>
          </div>
        </aside>

        <main ref={mainRef} className="workspace-shell-main workspace-shell-main--stack">
          {topBanner}
          <div className="workspace-shell-main-inner">{children}</div>
          {footer}
        </main>
      </div>
    </div>
  );
}
