'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/employer', label: 'Home' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/jobs/import', label: 'Import' },
  { href: '/employer/jobs/new', label: 'Post job' },
  { href: '/employer/applications', label: 'Workforce AP Applicants' },
];

function activeHrefForPath(pathname: string): string | null {
  if (pathname === '/employer') return '/employer';
  const candidates = NAV_LINKS.filter(
    (l) => l.href !== '/employer' && (pathname === l.href || pathname.startsWith(`${l.href}/`))
  ).map((l) => l.href);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

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
  const activeHref = useMemo(() => activeHrefForPath(pathname), [pathname]);

  return (
    <div className="employer-portal-shell">
      <header className="employer-portal-header">
        <div className="employer-portal-header-inner">
          <div className="employer-portal-brand-row">
            <div className="employer-portal-brand-block">
              <Link href="/employer" className="employer-portal-brand">
                WorkforceAP
              </Link>
              <span className="employer-portal-tagline">Employer hiring partner · Austin-first launch</span>
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
      <main className="employer-portal-main">{children}</main>
    </div>
  );
}
