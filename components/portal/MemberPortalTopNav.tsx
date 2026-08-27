'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useLayoutEffect, useRef } from 'react';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

export default function MemberPortalTopNav({
  badgeCounts,
  hrefMap,
}: {
  badgeCounts?: Partial<Record<NavBadgeKey, number>>;
  /** Rewrite canonical /dashboard hrefs (used by /dev/member proofs). */
  hrefMap?: Record<string, string>;
}) {
  const pathname = usePathname() ?? '/dashboard';
  const t = useTranslations('nav');
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const setVar = () => {
      document.documentElement.style.setProperty('--member-portal-top-nav-h', `${el.offsetHeight}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--member-portal-top-nav-h');
    };
  }, []);

  const remap = (href: string) => hrefMap?.[href] ?? href;
  const isActive = (canonical: string, href: string) => {
    if (pathname === href || pathname === `${href}/`) return true;
    if (canonical === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    return pathname.startsWith(`${href}/`) || pathname.startsWith(`${canonical}/`) || pathname === canonical;
  };

  // Proofs pass hrefMap to stay on /dev/member. Omit tabs whose canonical
  // isn't remapped so they don't drop members onto live /dashboard/* routes
  // (AI Advisor → /dashboard/counselor would duplicate Career Tools anyway).
  const tabs = [
    { canonical: '/dashboard', label: t('dashboard'), icon: 'home' },
    { canonical: '/dashboard/program', label: t('myProgram'), icon: 'school' },
    { canonical: '/dashboard/ai-tools', label: t('careerToolkit'), icon: 'auto_awesome' },
    { canonical: '/dashboard/messages', label: t('counselorChat'), icon: 'chat', badgeKey: 'counselor_messages_unread' as NavBadgeKey },
    { canonical: '/dashboard/jobs', label: t('jobBoard'), icon: 'work' },
    { canonical: '/dashboard/counselor', label: t('aiCounselor'), icon: 'support_agent' },
  ].filter((tab) => !hrefMap || tab.canonical in hrefMap);

  return (
    <nav ref={navRef} className="member-portal-top-nav" aria-label={t('memberPortal')}>
      <ul className="member-portal-top-nav__list">
        {tabs.map((tab) => {
          const href = remap(tab.canonical);
          const active = isActive(tab.canonical, href);
          const badge = tab.badgeKey ? badgeCounts?.[tab.badgeKey] : undefined;
          return (
            <li key={tab.canonical} className="member-portal-top-nav__item">
              <Link
                href={href}
                prefetch={tab.canonical === '/dashboard'}
                className={`member-portal-top-nav__link${active ? ' member-portal-top-nav__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="material-symbols-outlined member-portal-top-nav__icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="member-portal-top-nav__label">{tab.label}</span>
                {badge && badge > 0 ? (
                  <span className="member-portal-top-nav__badge" aria-label={t('unreadCount', { count: badge })}>
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
