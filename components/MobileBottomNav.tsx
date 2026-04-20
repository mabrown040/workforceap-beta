'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type NavBadgeKey,
  type NavTab,
  type PortalNavItem,
  MEMBER_PORTAL_NAV_ITEMS,
  NAV_TAB_META,
  NAV_TAB_ORDER,
  getActiveTab,
} from '@/lib/nav/portalNav';

/**
 * Responsive breakpoint for mobile nav visibility
 * Matches Tailwind md breakpoint (768px)
 */
const MOBILE_NAV_BREAKPOINT = 768;

const MARKETING_TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find-your-path', label: 'Quiz', icon: 'quiz' },
  { href: '/programs', label: 'Programs', icon: 'school' },
  { href: '/apply', label: 'Apply', icon: 'assignment_turned_in' },
];

function getMemberBottomTabs() {
  // Align member mobile bottom tabs to the same tab model as the workspace shell.
  // Link each tab to the first nav item in that tab.
  return NAV_TAB_ORDER.map((tab) => {
    const meta = NAV_TAB_META[tab];
    const firstItem = MEMBER_PORTAL_NAV_ITEMS.find((i) => i.tab === tab);
    return {
      href: firstItem?.href ?? '/dashboard',
      label: meta.label,
      icon: meta.icon,
      tourTarget: firstItem?.tourTarget,
      tab,
    };
  });
}

/** Determine which tab contains a given badge key so the bottom nav dot shows on the right tab. */
function tabForBadgeKey(items: PortalNavItem[], key: NavBadgeKey): NavTab | null {
  for (const item of items) {
    if ((item.badgeKey === key || item.badgeKeys?.includes(key)) && item.tab) {
      return item.tab;
    }
  }
  return null;
}

const EMPLOYER_TABS = [
  { href: '/employer', label: 'Overview', icon: 'dashboard' },
  { href: '/employer/jobs', label: 'Jobs', icon: 'work' },
  { href: '/employer/pipeline', label: 'Pipeline', icon: 'account_tree' },
  { href: '/employer/messages', label: 'Messages', icon: 'chat' },
];

const COUNSELOR_TABS = [
  { href: '/counselor', label: 'Overview', icon: 'dashboard' },
  { href: '/counselor/students', label: 'Members', icon: 'groups' },
  { href: '/counselor/messages', label: 'Messages', icon: 'chat' },
  { href: '/counselor/resources', label: 'Resources', icon: 'menu_book' },
];

const PARTNER_TABS = [
  { href: '/partner', label: 'Overview', icon: 'dashboard' },
  { href: '/partner/referred-members', label: 'Members', icon: 'groups' },
  { href: '/partner/messages', label: 'Messages', icon: 'chat' },
  { href: '/partner/milestones', label: 'Milestones', icon: 'flag' },
  { href: '/partner/outcomes', label: 'Outcomes', icon: 'bar_chart' },
];

const ADMIN_TABS = [
  { href: '/admin', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/members', label: 'Members', icon: 'groups' },
  { href: '/admin/pipeline', label: 'Pipeline', icon: 'account_tree' },
  { href: '/admin/exports', label: 'Exports', icon: 'download' },
];

interface MobileBottomNavProps {
  variant?: 'marketing' | 'portal' | 'employer' | 'counselor' | 'partner' | 'admin';
  badgeCounts?: Partial<Record<NavBadgeKey, number>>;
}

export default function MobileBottomNav({ variant = 'marketing', badgeCounts }: MobileBottomNavProps) {
  const pathname = usePathname() ?? '';
  const tabs =
    variant === 'portal' ? getMemberBottomTabs()
    : variant === 'employer' ? EMPLOYER_TABS
    : variant === 'counselor' ? COUNSELOR_TABS
    : variant === 'partner' ? PARTNER_TABS
    : variant === 'admin' ? ADMIN_TABS
    : MARKETING_TABS;
  const activeMemberTab = variant === 'portal' ? getActiveTab(pathname, MEMBER_PORTAL_NAV_ITEMS) : null;
  const messageTab = variant === 'portal' ? tabForBadgeKey(MEMBER_PORTAL_NAV_ITEMS, 'counselor_messages_unread') : null;

  return (
    <>
      {/* Mobile-only visibility: hidden on desktop (≥768px) */}
      <style>{`
        @media (min-width: ${MOBILE_NAV_BREAKPOINT}px) {
          .mobile-bottom-nav-root {
            display: none !important;
          }
        }
        @media (max-width: ${MOBILE_NAV_BREAKPOINT - 1}px) {
          .mobile-bottom-nav-root {
            display: flex !important;
          }
        }
      `}</style>
      <nav
        className={`marketing-bottom-nav mobile-bottom-nav-root mobile-bottom-nav--${variant}`}
        style={{
          position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
        paddingTop: '0.5rem',
        paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map((tab) => {
        const { href, label, icon } = tab;
        const tourTarget = 'tourTarget' in tab ? tab.tourTarget : undefined;
        const exactMatch = ['/', '/dashboard', '/employer', '/counselor', '/partner'];
        const isActive =
          variant === 'portal' && 'tab' in tab
            ? tab.tab === activeMemberTab
            : exactMatch.includes(href)
              ? pathname === href
              : pathname.startsWith(href);
        const b =
          variant === 'portal' && 'tab' in tab && messageTab != null && tab.tab === messageTab
            ? (badgeCounts?.counselor_messages_unread ?? 0)
            : 0;
        const showBadge = b > 0;
        return (
          <Link
            key={href}
            href={href}
            className={`marketing-bottom-nav__link${isActive ? ' marketing-bottom-nav__link--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            {...(tourTarget ? { 'data-tour': tourTarget } : {})}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '28px',
                  lineHeight: 1,
                }}
               aria-hidden="true">
                {icon}
              </span>
              {b > 0 ? (
                <span
                  aria-label={`${b} unread`}
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--color-accent, #ad2c4d)',
                    border: '1.5px solid var(--color-white, #fff)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                  }}
                >
                  {b > 99 ? '99+' : b}
                </span>
              ) : null}
            </span>
            <span className="marketing-bottom-nav__label">{label}</span>
          </Link>
        );
      })}
      </nav>
    </>
  );
}
