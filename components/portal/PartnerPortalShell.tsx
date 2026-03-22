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
              <span className="employer-portal-tagline">Partner portal</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start', maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>
        <aside style={{ position: 'sticky', top: '1rem', alignSelf: 'start', background: 'white', border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)', marginBottom: '0.75rem' }}>Partner workspace</p>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={{ padding: '0.65rem 0.75rem', borderRadius: 8, background: activeHref === href ? 'var(--color-light)' : 'transparent', fontWeight: activeHref === href ? 700 : 500 }}>
                {label}
              </Link>
            ))}
          </div>
        </aside>
        <main className="employer-portal-main">{children}</main>
      </div>
    </div>
  );
}
