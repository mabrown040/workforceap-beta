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
  const active = pathname === '/my-group';

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <div className="employer-portal-brand-row">
            <div className="employer-portal-brand-block">
              <Link href="/my-group" className="employer-portal-brand">
                WorkforceAP
              </Link>
              <span className="employer-portal-tagline">My group view · accountability and support</span>
            </div>
            <Link href="/" className="employer-portal-home-link">
              Site home
            </Link>
          </div>
          <nav className="employer-portal-nav" aria-label="My group navigation">
            <Link href="/my-group" className={active ? 'active' : undefined}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start', maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>
        <aside style={{ position: 'sticky', top: '1rem', alignSelf: 'start', background: 'white', border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)', marginBottom: '0.75rem' }}>Group workspace</p>
          <Link href="/my-group" style={{ display: 'block', padding: '0.65rem 0.75rem', borderRadius: 8, background: active ? 'var(--color-light)' : 'transparent', fontWeight: active ? 700 : 500 }}>
            My Group
          </Link>
        </aside>
        <main className="employer-portal-main">{children}</main>
      </div>
    </div>
  );
}
