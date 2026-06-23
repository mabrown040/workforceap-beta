'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import { ChevronLeft, ChevronRight, Menu, ShieldHalf } from 'lucide-react';
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
import SuperAdminViewSwitcher, { useIsSuperAdmin } from '@/components/super-admin-view-switcher';
import PortalHeaderActions from './PortalHeaderActions';
import PortalRoleSwitcher from './PortalRoleSwitcher';
import { SignOutButton } from './SignOutButton';
import MobileBottomNav from '@/components/MobileBottomNav';
import MemberPortalTopNav from './MemberPortalTopNav';
import GlobalSearch from './GlobalSearch';
import type { PortalSwitcherRole } from '@/lib/auth/portalRoleSwitcher';
import LanguageToggle from '@/components/portal/LanguageToggle';
import { useTranslations, useLocale } from 'next-intl';
import { useWorkspaceMobileScrollChrome } from '@/hooks/useWorkspaceMobileScrollChrome';

// Map non-member portal roles to MobileBottomNav variants. Member uses
// MemberPortalTopNav (sticky-top horizontal-scroll) per /plan-design-review
// Decision 3 (2026-04-25).
const ROLE_TO_NAV_VARIANT: Partial<Record<PortalRole, 'employer' | 'partner' | 'counselor' | 'admin'>> = {
  employer: 'employer',
  partner: 'partner',
  counselor: 'counselor',
  admin: 'admin',
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
  attributionLabel,
  partnerAccentColor,
  orgPrimaryColor,
  orgAccentColor,
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
  /**
   * Small "Powered by …" attribution shown on the right of the header.
   * Used in white-labeled partner portals where the partner brand owns the left side.
   */
  attributionLabel?: string;
  /**
   * Optional partner-scoped accent color (hex). When provided, exposed as the
   * `--partner-accent` CSS variable on the shell root so partner-specific UI
   * can opt in without overriding the global `--color-accent`.
   */
  partnerAccentColor?: string | null;
  /** Org-level primary brand color (hex). Exposed as `--org-primary-color`. */
  orgPrimaryColor?: string | null;
  /** Org-level accent/secondary brand color (hex). Exposed as `--org-accent-color`. */
  orgAccentColor?: string | null;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  // next/navigation usePathname() keeps the locale prefix (e.g. /en/admin), but
  // nav hrefs are locale-less (/admin) — strip the active locale so active-route
  // matching (and the crimson active rail item) works across every portal.
  const rawPathname = usePathname() ?? '';
  const pathname =
    rawPathname === `/${locale}`
      ? '/'
      : rawPathname.startsWith(`/${locale}/`)
        ? rawPathname.slice(locale.length + 1)
        : rawPathname;
  const activeHref = getBestActiveHref(pathname, navItemsForActiveRoute(navItems));
  const hasTabs = navItems.some((i) => i.tab);
  const activeTab = hasTabs ? getActiveTab(pathname, navItems) : null;
  // Members now use the left command-rail on desktop (the flat top-nav is hidden
  // there), and that rail is the ONLY nav — so it must show every item grouped by
  // `group`, not just the active tab's slice (which would strand most pages).
  // Tab-filtering still drives the member flat top-nav on mobile/tablet.
  const desktopNavItems =
    portalRole === 'member'
      ? navItems
      : hasTabs && activeTab
        ? navItems.filter((i) => i.tab === activeTab)
        : navItems;
  const mobileDrawerNavItems = navItems;
  // Member flat top-nav (#2069): a single-level, horizontally-scrollable nav that
  // matches the wa-v2-member mockup — the mockup's primary destinations come first,
  // then every remaining page follows in the same row. Because ALL items live in
  // this one nav, the contextual left sidebar can be hidden for members (portal CSS)
  // without orphaning any page (the failure mode that got the earlier CSS-only
  // sidebar-hide reverted — see docs/PORTAL_NAV_SPEC.md §2).
  const MEMBER_PRIMARY_HREFS = [
    '/dashboard',
    '/dashboard/program',
    '/dashboard/jobs',
    '/dashboard/certifications',
    '/dashboard/ai-tools',
    '/dashboard/readiness',
    '/dashboard/messages',
    '/dashboard/profile',
  ];
  const memberFlatNav =
    portalRole === 'member'
      ? [
          ...MEMBER_PRIMARY_HREFS.flatMap((h) => {
            const it = navItems.find((i) => i.href === h);
            return it ? [it] : [];
          }),
          ...navItems.filter((i) => !MEMBER_PRIMARY_HREFS.includes(i.href)),
        ]
      : [];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [wide, setWide] = useState(false);
  const [badges, setBadges] = useState<Partial<Record<NavBadgeKey, number>>>({});
  const isCollapsedDesktop = collapsed && wide;
  const isMobileDrawer = drawerOpen && !wide;
  const fetchedIsSuperAdmin = useIsSuperAdmin();
  const isSuperAdmin = superAdmin ?? fetchedIsSuperAdmin;
  const tNav = useTranslations('nav');
  const tWorkspace = useTranslations('workspace');
  const tGroup = useTranslations('group');
  /**
   * Translates a nav label string using the appropriate namespace.
   * Falls back to the original English string if no key is found.
   */
  const translateLabel = (label: string): string => {
    // Workspace labels
    const wsMap: Record<string, string> = {
      'WorkforceAP site': tWorkspace('publicSite'),
      'Member portal': tWorkspace('member'),
      'Employer portal': tWorkspace('employer'),
      'Partner portal': tWorkspace('partner'),
      'Counselor portal': tWorkspace('counselor'),
      'Admin workspace': tWorkspace('admin'),
    };
    if (label in wsMap) return wsMap[label];
    // Group labels
    const grpMap: Record<string, string> = {
      'Workflows': tGroup('workflows'),
      'Insights': tGroup('insights'),
      'Manage': tGroup('manage'),
    };
    if (label in grpMap) return grpMap[label];
    // Nav labels
    const navMap: Record<string, string> = {
      'Home': tNav('dashboard'),
      'My Program': tNav('myProgram'),
      'My Classes': tNav('training'),
      'My Certificates': tNav('myCertificates'),
      'My Career Plan': tNav('careerPlan'),
      'WIOA Qualification': tNav('wioaQualification'),
      'Job Board': tNav('jobBoard'),
      'Job Applications': tNav('jobApplications'),
      'Resume': tNav('resume'),
      'My Progress': tNav('myProgress'),
      'Career Toolkit': tNav('careerToolkit'),
      'AI Counselor': tNav('aiCounselor'),
      'Learning Hub': tNav('learningHub'),
      'Find your career': tNav('findYourCareer'),
      'Training Preassessment': tNav('trainingPreassessment'),
      'Weekly Recap': tNav('weeklyRecap'),
      'Counselor Chat': tNav('counselorChat'),
      'Resources': tNav('resources'),
      'Help & Support': tNav('help'),
      'Member Guide': tNav('memberGuide'),
      'Profile & Settings': tNav('profile'),
      'My Account': tNav('myAccount'),
      'Sign out': tNav('signOut'),
    };
    if (label in navMap) return navMap[label];
    return label;
  };
  const mainRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const trapRef = useFocusTrap(isMobileDrawer, closeDrawer);
  useWorkspaceMobileScrollChrome();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const collapseKey = `wa_nav_collapsed_${portalRole}`;

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    try {
      if ('inert' in el) {
        (el as HTMLElement & { inert?: boolean }).inert = isMobileDrawer;
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
  }, [isMobileDrawer]);

  // Body scroll lock with scroll position preservation
  useEffect(() => {
    if (isMobileDrawer) {
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
  }, [isMobileDrawer]);

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

  const rootStyle: React.CSSProperties | undefined = (() => {
    const style: Record<string, string> = {};
    if (partnerAccentColor && /^#[0-9A-Fa-f]{6}$/.test(partnerAccentColor)) {
      style['--partner-accent'] = partnerAccentColor;
    }
    if (orgPrimaryColor && /^#[0-9A-Fa-f]{6}$/.test(orgPrimaryColor)) {
      style['--org-primary-color'] = orgPrimaryColor;
    }
    if (orgAccentColor && /^#[0-9A-Fa-f]{6}$/.test(orgAccentColor)) {
      style['--org-accent-color'] = orgAccentColor;
    }
    return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined;
  })();

  return (
    <div className="workspace-shell-root" style={rootStyle}>
      <header
        ref={headerRef}
        className={`workspace-shell-header${minimalMobileHeader ? ' workspace-shell-header--minimal-mobile' : ''}`}
      >
        <div className="workspace-shell-header__brand">
          <button
            type="button"
            className="workspace-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label={tNav('openMenu')}
            aria-expanded={drawerOpen}
            aria-controls="workspace-sidebar"
          >
            <Menu size={22} strokeWidth={2} aria-hidden />
          </button>
          <div className="workspace-shell-brand-block">
            <Link href={firstHref} prefetch={false} className="workspace-shell-brand">
              WorkforceAP
            </Link>
            <span className="workspace-shell-tagline">{translateLabel(workspaceLabel)}</span>
            {marketingSiteHref ? (
              <Link
                href={marketingSiteHref}
                prefetch={false}
                className="workspace-shell-public-site-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined" aria-hidden style={{ fontSize: '1rem' }}>
                  open_in_new
                </span>
                {marketingSiteLabel ?? tNav('publicSite')}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="workspace-shell-header__meta">
          {contextLogoUrl ? (
            <span className="workspace-shell-context-logo-wrap" aria-hidden>
              <Image
                src={contextLogoUrl}
                alt=""
                width={36}
                height={36}
                className="workspace-shell-context-logo"
              />
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
          {/* Role switcher: show PortalRoleSwitcher for multi-role non-super-admins, OR for super-admins when impersonating (so they can switch within context) */}
          {!isSuperAdmin && portalRoles && portalRoles.length > 1 ? (
            <PortalRoleSwitcher userRoles={portalRoles} currentRole={portalRole} />
          ) : null}
          {/* SuperAdminViewSwitcher: primary navigation for super admins; shown in all portal contexts */}
          <SuperAdminViewSwitcher initialIsSuperAdmin={isSuperAdmin} />
          {/* When super admin is impersonating, show an inline impersonation chip for clarity */}
          {superAdmin && superAdminImpersonating ? (
            <span className="workspace-shell-impersonating-chip" title="You are viewing this workspace as an administrator">
              <span className="workspace-shell-impersonating-indicator" />
              Viewing as
            </span>
          ) : null}
          {/* Global search for admin now lives in the command rail (see
              workspace-sidebar-search below), matching the admin-full mockup. */}
          <PortalHeaderActions badges={badges} />
          {attributionLabel ? (
            <span
              className="workspace-shell-attribution"
              style={{
                fontSize: '0.7rem',
                color: 'var(--color-on-surface-variant)',
                whiteSpace: 'nowrap',
                marginLeft: '0.25rem',
              }}
              aria-label={attributionLabel}
            >
              {attributionLabel}
            </span>
          ) : null}
        </div>
      </header>

      {showResumeUploadHint ? (
        <div className="workspace-resume-upload-hint" role="status">
          <span className="workspace-resume-upload-hint__text">
            No resume on file yet — upload one to power AI tools and your coach.
          </span>
          <Link href="/dashboard/resume" prefetch={false} className="workspace-resume-upload-hint__cta">
            Upload resume
          </Link>
        </div>
      ) : null}

      {superAdmin && superAdminImpersonating && superAdminBackHref && (
        <div className="workspace-super-admin-banner">
          Viewing as <strong>{contextLabel}</strong>.{' '}
          <Link href={superAdminBackHref} prefetch={false}>{superAdminBackLabel ?? 'Switch'}</Link>
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
        <nav
          ref={tabBarRef}
          className={`workspace-tab-bar${portalRole === 'member' ? ' workspace-tab-bar--flat' : ''}`}
          aria-label={tNav('workspaceTabs')}
        >
          <div className="workspace-tab-bar-inner">
            {portalRole === 'member'
              ? /* Flat single-level member nav (#2069) — every page in one scrollable row. */
                memberFlatNav.map((item) => {
                  const isActive =
                    activeHref === item.href ||
                    isActiveRoute(pathname, item.href, item.aliases ?? []);
                  const b = badgeTotalForItem(badges, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`workspace-tab workspace-tab--flat${isActive ? ' workspace-tab--active' : ''}`}
                      onClick={closeDrawer}
                      {...(item.tourTarget ? { 'data-tour': item.tourTarget } : {})}
                    >
                      <span className="workspace-tab-label">{translateLabel(item.label)}</span>
                      {b > 0 ? (
                        <span className="workspace-nav-badge">{b > 99 ? '99+' : b}</span>
                      ) : null}
                    </Link>
                  );
                })
              : NAV_TAB_ORDER.map((tab) => {
                  const meta = NAV_TAB_META[tab];
                  const isActive = tab === activeTab;
                  // Find the first item in this tab to link to
                  const firstItem = navItems.find((i) => i.tab === tab);
                  return (
                    <Link
                      key={tab}
                      href={firstItem?.href ?? '/dashboard'}
                      prefetch={false}
                      className={`workspace-tab${isActive ? ' workspace-tab--active' : ''}`}
                      onClick={closeDrawer}
                    >
                      <span className="material-symbols-outlined workspace-tab-icon" aria-hidden>{meta.icon}</span>
                      <span className="workspace-tab-label">{translateLabel(meta.label)}</span>
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
              {portalRole === 'admin' ? (
                /* Branded admin command-rail header (matches admin-full mockup:
                   shield tile + product + "Admin · {org}"). Collapses to just
                   the mark when the rail is collapsed. */
                <div className="workspace-sidebar-brand" title={`Admin · ${contextLabel}`}>
                  <span className="workspace-sidebar-brand-mark" aria-hidden>
                    <ShieldHalf size={16} />
                  </span>
                  {!isCollapsedDesktop ? (
                    <span className="workspace-sidebar-brand-text">
                      <span className="workspace-sidebar-brand-name">WorkforceAP</span>
                      <span className="workspace-sidebar-brand-sub">{translateLabel(workspaceLabel)}</span>
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="workspace-sidebar-label">{!wide && hasTabs && activeTab ? translateLabel(NAV_TAB_META[activeTab].label) : translateLabel(workspaceLabel)}</div>
              )}
              {wide ? (
                <button
                  type="button"
                  className="workspace-sidebar-collapse-btn"
                  onClick={toggleCollapse}
                  aria-label={collapsed ? tNav('expandSidebar') : tNav('collapseSidebar')}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
                </button>
              ) : null}
            </div>
            {/* In-rail admin search — matches the mockup's "Search admin…" placement.
                Hidden when the desktop rail is collapsed. */}
            {portalRole === 'admin' && !isCollapsedDesktop ? (
              <div className="workspace-sidebar-search">
                <GlobalSearch />
              </div>
            ) : null}
            <nav aria-label={`${translateLabel(workspaceLabel)} navigation`} className="workspace-sidebar-nav">
              <ul className="workspace-sidebar-list workspace-sidebar-list--root">
                {GROUP_ORDER.map((group) => {
                  const list = wide ? desktopNavItems : mobileDrawerNavItems;
                  const inGroup = list.filter((i) => i.group === group);
                  if (inGroup.length === 0) return null;
                  const groupLabel = NAV_GROUP_LABELS[group];
                  return (
                    <li key={group} className="workspace-sidebar-group">
                      {groupLabel && !isCollapsedDesktop ? (
                        <div className="workspace-sidebar-group-label">{translateLabel(groupLabel)}</div>
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
                                prefetch={false}
                                className={`workspace-sidebar-link${isActive ? ' active' : ''}`}
                                onClick={closeDrawer}
                                title={isCollapsedDesktop ? translateLabel(item.label) : undefined}
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
                                  {translateLabel(item.label)}
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
                <SuperAdminViewSwitcher initialIsSuperAdmin={isSuperAdmin} />
              </div>
              <Link href="/" prefetch={false} className="workspace-sidebar-home-link" onClick={closeDrawer}>
                {translateLabel(PRODUCT_COPY.publicSiteLabel)}
              </Link>
              <div style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'center' }}>
                <LanguageToggle />
              </div>
              <SignOutButton className="workspace-sidebar-signout" onSignOutStart={closeDrawer}>
                {translateLabel('Sign out')}
              </SignOutButton>
            </div>
          </div>
        </aside>

        <div ref={mainRef} className="workspace-shell-main workspace-shell-main--stack">
          {portalRole === 'member' ? <MemberPortalTopNav badgeCounts={badges} /> : null}
          {topBanner}
          <div className="workspace-shell-main-inner">{children}</div>
          {footer}
        </div>
      </div>
      {/* Mobile bottom nav for non-member roles. Members use MemberPortalTopNav. */}
      {ROLE_TO_NAV_VARIANT[portalRole] ? (
        <MobileBottomNav variant={ROLE_TO_NAV_VARIANT[portalRole]} badgeCounts={badges} />
      ) : null}
    </div>
  );
}
