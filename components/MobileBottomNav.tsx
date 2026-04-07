'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

const PORTAL_TABS = [
  { href: '/dashboard', label: 'Journey', icon: 'map', tourTarget: 'tour-dashboard' },
  { href: '/dashboard/ai-tools', label: 'AI Tools', icon: 'auto_awesome', tourTarget: 'tour-ai-tools' },
  { href: '/dashboard/messages', label: 'Messages', icon: 'chat', tourTarget: 'tour-messages' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'person', tourTarget: 'tour-profile' },
];

const EMPLOYER_TABS = [
  { href: '/employer', label: 'Overview', icon: 'dashboard' },
  { href: '/employer/jobs', label: 'Jobs', icon: 'work' },
  { href: '/employer/pipeline', label: 'Pipeline', icon: 'account_tree' },
  { href: '/employer/messages', label: 'Messages', icon: 'chat' },
];

const COUNSELOR_TABS = [
  { href: '/counselor', label: 'Overview', icon: 'dashboard' },
  { href: '/counselor/students', label: 'Students', icon: 'groups' },
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
}

export default function MobileBottomNav({ variant = 'marketing' }: MobileBottomNavProps) {
  const pathname = usePathname();
  const tabs =
    variant === 'portal' ? PORTAL_TABS
    : variant === 'employer' ? EMPLOYER_TABS
    : variant === 'counselor' ? COUNSELOR_TABS
    : variant === 'partner' ? PARTNER_TABS
    : variant === 'admin' ? ADMIN_TABS
    : MARKETING_TABS;

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
        zIndex: 50,
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
        const isActive = exactMatch.includes(href)
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`marketing-bottom-nav__link${isActive ? ' marketing-bottom-nav__link--active' : ''}`}
            {...(tourTarget ? { 'data-tour': tourTarget } : {})}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '22px',
                lineHeight: 1,
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {icon}
            </span>
            <span className="marketing-bottom-nav__label">{label}</span>
          </Link>
        );
      })}
      </nav>
    </>
  );
}
