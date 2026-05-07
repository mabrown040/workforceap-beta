'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

export default function MemberPortalTopNav({
  badgeCounts,
}: {
  badgeCounts?: Partial<Record<NavBadgeKey, number>>;
}) {
  const pathname = usePathname() ?? '/dashboard';
  const t = useTranslations('nav');

  const tabs = [
    { href: '/dashboard', label: t('dashboard'), icon: 'home', matches: (p: string) => p === '/dashboard' || p === '/dashboard/' },
    { href: '/dashboard/program', label: t('myProgram'), icon: 'school', matches: (p: string) => p.startsWith('/dashboard/program') },
    { href: '/dashboard/ai-tools', label: t('careerToolkit'), icon: 'auto_awesome', matches: (p: string) => p.startsWith('/dashboard/ai-tools') },
    { href: '/dashboard/messages', label: t('counselorChat'), icon: 'chat', matches: (p: string) => p.startsWith('/dashboard/messages'), badgeKey: 'counselor_messages_unread' as NavBadgeKey },
    { href: '/dashboard/jobs', label: t('jobBoard'), icon: 'work', matches: (p: string) => p.startsWith('/dashboard/jobs') },
    { href: '/dashboard/counselor', label: t('aiCounselor'), icon: 'support_agent', matches: (p: string) => p.startsWith('/dashboard/counselor') },
  ];

  return (
    <nav className="member-portal-top-nav" aria-label={t('memberPortal')}>
      <ul className="member-portal-top-nav__list" role="list">
        {tabs.map((tab) => {
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
