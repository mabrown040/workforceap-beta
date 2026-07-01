'use client';

import LocalizedLink from '@/components/LocalizedLink';
import { usePathname } from 'next/navigation';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

/**
 * Responsive breakpoint for mobile nav visibility
 * Matches Tailwind md breakpoint (768px)
 */
const MOBILE_NAV_BREAKPOINT = 768;

const MARKETING_TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/career-quiz', label: 'Quiz', icon: 'explore' },
  { href: '/programs', label: 'Programs', icon: 'school' },
  { href: '/apply', label: 'Apply', icon: 'assignment_turned_in' },
];

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
  { href: '/admin', label: 'Today', icon: 'home' },
  { href: '/admin/command-center', label: 'Queue', icon: 'assignment_ind' },
  { href: '/admin/members', label: 'Members', icon: 'groups' },
];

interface MobileBottomNavProps {
  variant?: 'marketing' | 'portal' | 'employer' | 'counselor' | 'partner' | 'admin';
  badgeCounts?: Partial<Record<NavBadgeKey, number>>;
}

function prefetchForBottomTab(variant: MobileBottomNavProps['variant'], href: string): boolean {
  if (variant === 'marketing') {
    return href === '/apply' || href === '/programs' || href === '/career-quiz';
  }
  return false;
}

export default function MobileBottomNav({ variant = 'marketing', badgeCounts }: MobileBottomNavProps) {
  const pathname = usePathname() ?? '';
  // Member portal switched from bottom-tab to sticky-top horizontal-scroll nav
  // (/plan-design-review Decision 3, 2026-04-25). The top nav is rendered by
  // WorkspaceShell. Pages that still call <MobileBottomNav variant="portal"/>
  // become no-ops so the change ships without touching 40+ page files.
  if (variant === 'portal') return null;
  const tabs =
    variant === 'employer' ? EMPLOYER_TABS
    : variant === 'counselor' ? COUNSELOR_TABS
    : variant === 'partner' ? PARTNER_TABS
    : variant === 'admin' ? ADMIN_TABS
    : MARKETING_TABS;
  return (
    <>
      {/* Mobile-only visibility: hidden on desktop (≥768px) */}
      {/* Bottom clearance: `marketing.css` — middleware `html.wap-reserve-mobile-bottom-nav` + `html:has(nav#mobile-bottom-nav)` */}
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
        id="mobile-bottom-nav"
        aria-label="Primary mobile navigation"
        className={`marketing-bottom-nav mobile-bottom-nav-root mobile-bottom-nav--${variant}`}
        style={{
          position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 60,
        display: 'flex',
        justifyContent: variant === 'marketing' ? 'space-around' : 'space-between',
        alignItems: 'center',
        gap: variant === 'marketing' ? 0 : '0.25rem',
        paddingLeft: variant === 'marketing' ? '0.5rem' : '0.25rem',
        paddingRight: variant === 'marketing' ? '0.5rem' : '0.25rem',
        paddingTop: '0.5rem',
        paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map((tab) => {
        const { href, label, icon } = tab;
        const tourTarget = 'tourTarget' in tab ? tab.tourTarget : undefined;
        const exactMatch = ['/', '/dashboard', '/admin', '/employer', '/counselor', '/partner'];
        const isActive = exactMatch.includes(href)
          ? pathname === href
          : pathname.startsWith(href);
        // Member badge logic moved to MemberPortalTopNav. Other variants do not
        // surface unread-message badges in the bottom nav today.
        const b = 0;
        const showBadge = b > 0;
        return (
          <LocalizedLink
            key={href}
            href={href}
            prefetch={prefetchForBottomTab(variant, href)}
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
          </LocalizedLink>
        );
      })}
      </nav>
    </>
  );
}
