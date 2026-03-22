'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';
import { MEMBER_PORTAL_NAV } from '@/lib/nav/memberPortalNav';
import { isActiveRoute } from '@/lib/nav/activeRoute';

export default function PortalNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="portal-nav" aria-label="Member portal navigation">
      <div className="portal-nav-inner">
        <ul className="portal-nav-links">
          {MEMBER_PORTAL_NAV.map(({ href, label, aliases }) => {
            const isActive = isActiveRoute(pathname, href, aliases);
            return (
              <li key={href}>
                <Link href={href} className={isActive ? 'active' : undefined}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="portal-nav-actions">
          <Link href="/" className="portal-nav-home">
            Site home
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
