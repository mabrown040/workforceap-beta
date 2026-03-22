'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';
import { getBestActiveHref } from '@/lib/nav/activeRoute';

const NAV_LINKS = [
  { href: '/employer', label: 'Home' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/jobs/import', label: 'Import' },
  { href: '/employer/jobs/new', label: 'Post job' },
  { href: '/employer/applications', label: 'Applicants' },
];

export default function EmployerPortalShell({
  companyName,
  superAdmin,
  children,
}: {
  companyName: string;
  superAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const activeHref = useMemo(() => getBestActiveHref(pathname, NAV_LINKS), [pathname]);

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <div className="employer-portal-brand-row">
            <div className="employer-portal-brand-block">
              <Link href="/employer" className="employer-portal-brand">
                WorkforceAP
              </Link>
              <span className="employer-portal-tagline">Employer hiring portal</span>
            </div>
            <Link href="/" className="employer-portal-home-link">
              Site home
            </Link>
          </div>
          <nav className="employer-portal-nav" aria-label="Employer navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={activeHref === href ? 'active' : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="employer-portal-actions">
            <SuperAdminViewSwitcher />
            <span className="employer-portal-company" title={companyName}>
              {companyName}
            </span>
            <SignOutButton className="btn btn-outline btn-sm">Sign out</SignOutButton>
          </div>
        </div>
      </header>
      {superAdmin && (
        <div className="employer-super-admin-banner">
          Viewing as <strong>{companyName}</strong>.{' '}
          <Link href="/admin/employers">Switch company</Link>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start', maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>
        <aside style={{ position: 'sticky', top: '1rem', alignSelf: 'start', background: 'white', border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-500)', marginBottom: '0.75rem' }}>Employer workspace</p>
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
