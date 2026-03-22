'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

export default function MyGroupShell({
  groupNames,
  children,
}: {
  groupNames: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <div className="employer-portal-brand-row">
            <div className="employer-portal-brand-block">
              <Link href="/my-group" className="employer-portal-brand">
                WorkforceAP
              </Link>
              <span className="employer-portal-tagline">Group leader view</span>
            </div>
            <Link href="/" className="employer-portal-home-link">
              Site home
            </Link>
          </div>
          <nav className="employer-portal-nav" aria-label="My group navigation">
            <Link href="/my-group" className={pathname === '/my-group' ? 'active' : undefined}>
              My Group
            </Link>
          </nav>
          <div className="employer-portal-actions">
            <span className="employer-portal-company" title={groupNames}>
              {groupNames}
            </span>
            <SignOutButton className="btn btn-outline btn-sm">Sign out</SignOutButton>
          </div>
        </div>
      </header>
      <main className="employer-portal-main">{children}</main>
    </div>
  );
}
