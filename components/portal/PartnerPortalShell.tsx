'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/guide', label: 'Referral guide' },
  { href: '/partner/resources', label: 'Resources' },
];

export default function PartnerPortalShell({
  partnerName,
  children,
}: {
  partnerName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div>
      <nav className="portal-nav" aria-label="Partner portal navigation">
        <div className="portal-nav-inner">
          <ul className="portal-nav-links">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    pathname === href || (href !== '/partner' && pathname.startsWith(href)) ? 'active' : undefined
                  }
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="portal-nav-actions">
            <SuperAdminViewSwitcher />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginRight: '0.5rem' }}>{partnerName}</span>
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
