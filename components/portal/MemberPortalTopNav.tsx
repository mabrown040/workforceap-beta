'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

type Tab = {
  href: string;
  label: string;
  icon: string;
  matches: (pathname: string) => boolean;
  badgeKey?: NavBadgeKey;
};

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Home', icon: 'home', matches: (p) => p === '/dashboard' || p === '/dashboard/' },
  { href: '/dashboard/program', label: 'My Program', icon: 'school', matches: (p) => p.startsWith('/dashboard/program') },
  { href: '/dashboard/ai-tools', label: 'AI Toolkit', icon: 'auto_awesome', matches: (p) => p.startsWith('/dashboard/ai-tools') },
  { href: '/dashboard/messages', label: 'Messages', icon: 'chat', matches: (p) => p.startsWith('/dashboard/messages'), badgeKey: 'memberUnreadMessages' },
  { href: '/dashboard/jobs', label: 'Jobs', icon: 'work', matches: (p) => p.startsWith('/dashboard/jobs') },
  { href: '/dashboard/counselor', label: 'My Counselor', icon: 'support_agent', matches: (p) => p.startsWith('/dashboard/counselor') },
];

export default function MemberPortalTopNav({
  badgeCounts,
}: {
  badgeCounts?: Partial<Record<NavBadgeKey, number>>;
}) {
  const pathname = usePathname() ?? '/dashboard';

  return (
    <nav className="member-portal-top-nav" aria-label="Member portal navigation">
      <ul className="member-portal-top-nav__list" role="list">
        {TABS.map((tab) => {
          const active = tab.matches(pathname);
          const badge = tab.badgeKey ? badgeCounts?.[tab.badgeKey] : undefined;
          return (
            <li key={tab.href} className="member-portal-top-nav__item">
              <Link
                href={tab.href}
                className={`member-portal-top-nav__link${active ? ' member-portal-top-nav__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="material-symbols-outlined member-portal-top-nav__icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="member-portal-top-nav__label">{tab.label}</span>
                {badge && badge > 0 ? (
                  <span className="member-portal-top-nav__badge" aria-label={`${badge} unread`}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <span className="member-portal-top-nav__edge-fade" aria-hidden="true" />
    </nav>
  );
}

// Ensure the component is treeshakeable when imported via dynamic.
export const _topNavStyleRef: CSSProperties = {};
