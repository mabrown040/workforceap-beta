'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';
import { getBestActiveHref } from '@/lib/nav/activeRoute';

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
  const activeHref = getBestActiveHref(pathname, NAV_LINKS);

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <div className="employer-portal-brand-row">
            <div className="employer-portal-brand-block">
              <Link href="/partner" className="employer-portal-brand">
                WorkforceAP
              </Link>
              <span className="employer-portal-tagline">Partner progress view · Austin-first launch</span>
            </div>
            <Link href="/" className="employer-portal-home-link">
              Site home
            </Link>
          </div>
          <nav className="employer-portal-nav" aria-label="Partner portal navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={activeHref === href ? 'active' : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="employer-portal-actions">
            <SuperAdminViewSwitcher />
            <span className="employer-portal-company" title={partnerName}>
              {partnerName}
            </span>
            <SignOutButton className="btn btn-outline btn-sm">Sign out</SignOutButton>
          </div>
        </div>
      </header>
      <main className="employer-portal-main">{children}</main>
    </div>
  );
}
