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
        background: 'rgba(252, 249, 248, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(222, 191, 194, 0.3)',
      }}
      className="wa-md:hidden"
    >
      {tabs.map(({ href, label, icon }) => {
        const isActive = href === '/dashboard' || href === '/'
          ? pathname === href
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 12px',
              borderRadius: '12px',
              minWidth: '56px',
              transition: 'all 150ms',
              textDecoration: 'none',
              ...(isActive
                ? { background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff' }
                : { color: '#584144' }),
            }}
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
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
