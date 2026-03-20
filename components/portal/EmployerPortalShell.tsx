'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/employer', label: 'Dashboard' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/jobs/new', label: 'Post Job' },
  { href: '/employer/jobs/import', label: 'Import Job' },
  { href: '/employer/applications', label: 'Applications' },
  { href: '/employer/messages', label: 'Messages' },
];

export default function EmployerPortalShell({
  companyName,
  children,
}: {
  companyName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div>
      <nav className="portal-nav" aria-label="Employer portal navigation">
        <div className="portal-nav-inner">
          <ul className="portal-nav-links">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    pathname === href || (href !== '/employer' && pathname.startsWith(href))
                      ? 'active'
                      : undefined
                  }
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="portal-nav-actions">
            <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginRight: '0.5rem' }}>
              {companyName}
            </span>
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
