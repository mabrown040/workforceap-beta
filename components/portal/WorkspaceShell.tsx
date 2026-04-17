'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
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
import PortalRoleSwitcher from './PortalRoleSwitcher';
import { SignOutButton } from './SignOutButton';
import MobileBottomNav from '@/components/MobileBottomNav';
import GlobalSearch from './GlobalSearch';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';

// Map portal roles to MobileBottomNav variants
const ROLE_TO_NAV_VARIANT: Partial<Record<PortalRole, 'employer' | 'partner' | 'counselor' | 'portal'>> = {
  employer: 'employer',
  partner: 'partner',
  counselor: 'counselor',
  member: 'portal',
};

export default function WorkspaceShell({
  portalRole,
  navItems,
  workspaceLabel,
  contextLabel,
  minimalMobileHeader = false,
  superAdmin,
  superAdminImpersonating,
  superAdminBackHref,
  superAdminBackLabel,
  topBanner,
  footer,
  headerBadge,
  contextLogoUrl,
  marketingSiteHref,
  marketingSiteLabel,
  showResumeUploadHint,
  portalRoles,
  children,
}: {
  portalRole: PortalRole;
  navItems: PortalNavItem[];
  workspaceLabel: string;
  contextLabel: string;
  /** Reduce header chrome on mobile when bottom nav is primary (member portal). */
  minimalMobileHeader?: boolean;
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
  /** Public marketing site — shown prominently in header when set (e.g. member portal). */
  marketingSiteHref?: string;
  marketingSiteLabel?: string;
  /** Member: prompt to upload resume when none on file */
  showResumeUploadHint?: boolean;
  /** Optional set of role-switch targets for authenticated multi-role users */
  portalRoles?: PortalSwitcherRole[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const activeHref = getBestActiveHref(pathname, navItemsForActiveRoute(navItems));
  const hasTabs = navItems.some((i) => i.tab);
  const activeTab = hasTabs ? getActiveTab(pathname, navItems) : null;
  const desktopNavItems = hasTabs && activeTab ? navItems.filter((i) => i.tab === activeTab) : navItems;
  const mobileDrawerNavItems = navItems;
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
    try {
      if ('inert' in el) {
        (el as HTMLElement & { inert?: boolean }).inert = drawerOpen;
      }
    } catch {
      /* Safari / older browsers — skip; drawer overlay still blocks interaction */
    }
    return () => {
      try {
        if ('inert' in el) {
          (el as HTMLElement & { inert?: boolean }).inert = false;
        }
      } catch {
        /* ignore */
      }
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

  /** Enables `html[data-portal-role="…"]` rules in main.css (e.g. member mobile header chrome). */
  useEffect(() => {
    document.documentElement.setAttribute('data-portal-role', portalRole);
    return () => {
      document.documentElement.removeAttribute('data-portal-role');
    };
  }, [portalRole]);

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
        if (!cancelled) {
          startTransition(() => setBadges(data));
        }
      } catch {
        /* ignore */
      }
    };

    const deferId = window.setTimeout(() => {
      if (!cancelled) void load();
    }, 0);

    const onRefresh = () => void load();
    window.addEventListener('wa-nav-badges-refresh', onRefresh);
    return () => {
      cancelled = true;
      window.clearTimeout(deferId);
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
  const isMobileDrawer = drawerOpen && !wide;
  const headerRef = useRef<HTMLElement>(null);
  const tabBarRef = useRef<HTMLElement | null>(null);

  // Measure header + optional tab bar so sticky regions and sidebar offset stay in sync
  useEffect(() => {
    const headerEl = headerRef.current;
    const tabEl = tabBarRef.current;
    const update = () => {
      const hh = headerEl?.offsetHeight ?? 0;
      const th = tabEl?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--workspace-header-h', `${hh}px`);
      document.documentElement.style.setProperty('--workspace-tab-bar-h', `${th}px`);
      document.documentElement.style.setProperty('--workspace-top-offset', `${hh + th}px`);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const ro = new ResizeObserver(update);
    if (headerEl) ro.observe(headerEl);
    if (tabEl) ro.observe(tabEl);
    return () => ro.disconnect();
  }, [hasTabs, activeTab]);

  const firstHref = navItems[0]?.href ?? '/';

  return (
    <div className="workspace-shell-root">
      <header
        ref={headerRef}
        className={`workspace-shell-header${minimalMobileHeader ? ' workspace-shell-header--minimal-mobile' : ''}`}
      >
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
            {marketingSiteHref ? (
              <Link
                href={marketingSiteHref}
                className="workspace-shell-public-site-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined" aria-hidden style={{ fontSize: '1rem' }}>
                  open_in_new
                </span>
                {marketingSiteLabel ?? 'Public site'}
              </Link>
            ) : null}
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
          {portalRoles && portalRoles.length > 1 ? (
            <PortalRoleSwitcher userRoles={portalRoles} currentRole={portalRole} />
          ) : (
            <SuperAdminViewSwitcher />
          )}
          {/* Global search — admin only, hidden on mobile */}
          {portalRole === 'admin' && (
            <div className="wa-hidden wa-md:wa-block">
              <GlobalSearch />
            </div>
          )}
          <PortalHeaderActions />
        </div>
      </header>

      {showResumeUploadHint ? (
        <div className="workspace-resume-upload-hint" role="status">
          <span className="workspace-resume-upload-hint__text">
            No resume on file yet — upload one to power AI tools and your coach.
          </span>
          <Link href="/dashboard/resume" className="workspace-resume-upload-hint__cta">
            Upload resume
          </Link>
        </div>
      ) : null}

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
        <nav ref={tabBarRef} className="workspace-tab-bar" aria-label="Workspace tabs">
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
              <div className="workspace-sidebar-label">{!wide && hasTabs && activeTab ? NAV_TAB_META[activeTab].label : workspaceLabel}</div>
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
                  const list = wide ? desktopNavItems : mobileDrawerNavItems;
                  const inGroup = list.filter((i) => i.group === group);
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
      {/* Mobile bottom nav — shown on all portal roles on small screens */}
      {ROLE_TO_NAV_VARIANT[portalRole] ? (
        <MobileBottomNav variant={ROLE_TO_NAV_VARIANT[portalRole]} />
      ) : null}
    </div>
  );
}
