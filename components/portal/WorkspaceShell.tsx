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
  type NavTab,
  NAV_GROUP_LABELS,
  GROUP_ORDER,
  NAV_TAB_META,
  NAV_TAB_ORDER,
  navItemsForActiveRoute,
  badgeTotalForItem,
  getActiveTab,
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
  superAdminImpersonating,
  superAdminBackHref,
  superAdminBackLabel,
  topBanner,
  footer,
  headerBadge,
  contextLogoUrl,
  children,
}: {
  portalRole: PortalRole;
  navItems: PortalNavItem[];
  workspaceLabel: string;
  contextLabel: string;
  /** Optional square logo next to company name (employer portal). */
  contextLogoUrl?: string | null;
  superAdmin?: boolean;
  /** True when super_admin is viewing another org (cookie), not their own portal row */
  superAdminImpersonating?: boolean;
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
  const hasTabs = navItems.some((i) => i.tab);
  const activeTab = hasTabs ? getActiveTab(pathname, navItems) : null;
  const filteredNavItems = hasTabs && activeTab ? navItems.filter((i) => i.tab === activeTab) : navItems;
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

  // Body scroll lock with scroll position preservation
  useEffect(() => {
    if (drawerOpen) {
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('sidebar-open');
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
    const load = async () => {
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
    };
    void load();
    const onRefresh = () => void load();
    window.addEventListener('wa-nav-badges-refresh', onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('wa-nav-badges-refresh', onRefresh);
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
  const headerRef = useRef<HTMLElement>(null);

  // Measure header height so tab bar sticks below it
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty('--workspace-header-h', `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const firstHref = navItems[0]?.href ?? '/';

  return (
    <div className="workspace-shell-root">
      <header ref={headerRef} className="workspace-shell-header">
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
          {contextLogoUrl ? (
            <span className="workspace-shell-context-logo-wrap" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={contextLogoUrl} alt="" className="workspace-shell-context-logo" width={32} height={32} />
            </span>
          ) : null}
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

      {superAdmin && superAdminImpersonating && superAdminBackHref && (
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

      {hasTabs && activeTab && (
        <nav className="workspace-tab-bar" aria-label="Workspace tabs">
          <div className="workspace-tab-bar-inner">
            {NAV_TAB_ORDER.map((tab) => {
              const meta = NAV_TAB_META[tab];
              const isActive = tab === activeTab;
              // Find the first item in this tab to link to
              const firstItem = navItems.find((i) => i.tab === tab);
              return (
                <Link
                  key={tab}
                  href={firstItem?.href ?? '/dashboard'}
                  className={`workspace-tab${isActive ? ' workspace-tab--active' : ''}`}
                  onClick={closeDrawer}
                >
                  <span className="material-symbols-outlined workspace-tab-icon" aria-hidden>{meta.icon}</span>
                  <span className="workspace-tab-label">{meta.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

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
                  const inGroup = filteredNavItems.filter((i) => i.group === group);
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
                                {...(item.tourTarget ? { 'data-tour': item.tourTarget } : {})}
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
