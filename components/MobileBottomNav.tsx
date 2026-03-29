'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MARKETING_TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find-your-path', label: 'Quiz', icon: 'quiz' },
  { href: '/programs', label: 'Programs', icon: 'school' },
  { href: '/apply', label: 'Apply', icon: 'assignment_turned_in' },
];

const PORTAL_TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/dashboard/learning', label: 'Learning', icon: 'school' },
  { href: '/dashboard/messages', label: 'Messages', icon: 'chat' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'person' },
];

interface MobileBottomNavProps {
  variant?: 'marketing' | 'portal';
}

export default function MobileBottomNav({ variant = 'marketing' }: MobileBottomNavProps) {
  const pathname = usePathname();
  const tabs = variant === 'portal' ? PORTAL_TABS : MARKETING_TABS;

  return (
    <nav
      className="marketing-bottom-nav md:wa-hidden"
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
      {tabs.map(({ href, label, icon }) => {
        const isActive =
          href === '/dashboard' || href === '/' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`marketing-bottom-nav__link${isActive ? ' marketing-bottom-nav__link--active' : ''}`}
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
  );
}
