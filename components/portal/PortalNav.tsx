'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

const PORTAL_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ai-tools', label: 'AI Tools' },
  { href: '/resources', label: 'Resources' },
  { href: '/learning', label: 'Learning' },
  { href: '/certifications', label: 'Certifications' },
  { href: '/career-brief', label: 'Career Brief' },
  { href: '/weekly-recap', label: 'Weekly Recap' },
  { href: '/ai-tools/application-tracker', label: 'Applications' },
  { href: '/profile', label: 'Profile' },
  { href: '/partner', label: 'Partner Portal', partnerOnly: true },
];

export default function PortalNav() {
  const pathname = usePathname();
  const isPartnerRoute = pathname.startsWith('/partner');

  return (
    <nav className="portal-nav" aria-label="Member portal navigation">
      <div className="portal-nav-inner">
        <ul className="portal-nav-links">
          {PORTAL_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={isActive ? 'active' : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="portal-nav-actions">
          {isPartnerRoute && (
            <span style={{ fontSize: '0.75rem', background: 'var(--color-accent)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Partner View</span>
          )}
          <Link href="/" className="portal-nav-home">
            WorkforceAP
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
