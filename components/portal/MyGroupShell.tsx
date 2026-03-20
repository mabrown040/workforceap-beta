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
    <div>
      <nav className="portal-nav" aria-label="My group navigation">
        <div className="portal-nav-inner">
          <ul className="portal-nav-links">
            <li>
              <Link href="/my-group" className={pathname === '/my-group' ? 'active' : undefined}>
                My Group
              </Link>
            </li>
          </ul>
          <div className="portal-nav-actions">
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginRight: '0.5rem' }}>{groupNames}</span>
            <Link href="/" className="portal-nav-home">
              WorkforceAP
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
