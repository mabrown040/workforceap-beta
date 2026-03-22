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

/**
 * Same light tool-portal chrome as the employer portal (white header, gray page bg),
 * not the dark marketing-style `portal-nav` strip used for legacy member routes.
 */
export default function PartnerPortalShell({
  partnerName,
  children,
}: {
  partnerName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <Link href="/partner" className="employer-portal-brand">
            WorkforceAP
          </Link>
          <nav className="employer-portal-nav" aria-label="Partner portal navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={
                  pathname === href || (href !== '/partner' && pathname.startsWith(href)) ? 'active' : undefined
                }
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="employer-portal-actions">
            <SuperAdminViewSwitcher />
            <span className="employer-portal-company" title={partnerName}>
              {partnerName}
            </span>
            <Link href="/" className="employer-portal-home-link">
              Site home
            </Link>
            <SignOutButton className="btn btn-outline btn-sm">Sign out</SignOutButton>
          </div>
        </div>
      </header>
      <main className="employer-portal-main">{children}</main>
    </div>
  );
}
