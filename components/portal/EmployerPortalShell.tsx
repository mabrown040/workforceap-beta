'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/employer', label: 'Dashboard' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/jobs/new', label: 'Post Job' },
  { href: '/employer/jobs/import', label: 'Import jobs' },
  { href: '/employer/applications', label: 'Applications' },
  { href: '/employer/messages', label: 'Messages' },
];

export default function EmployerPortalShell({
  companyName,
  superAdmin,
  children,
}: {
  companyName: string;
  /** When true, show a short note linking to Admin → Employers to pick which company portal to help. */
  superAdmin?: boolean;
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
            <SuperAdminViewSwitcher />
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
      {superAdmin && (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0.75rem 1.5rem 0',
          }}
        >
          <div
            style={{
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: 'var(--color-gray-700)',
            }}
          >
            <strong>Super admin</strong> — viewing employer portal as <strong>{companyName}</strong>.{' '}
            <Link href="/admin/employers" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
              Choose company / open portal
            </Link>
          </div>
        </div>
      )}
      <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>{children}</div>
    </div>
  );
}
