'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

const PORTAL_LINKS: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/learning', label: 'Learning hub' },
  { href: '/dashboard/resources', label: 'Program resources' },
  { href: '/dashboard/ai-tools', label: 'AI Tools' },
  { href: '/certifications', label: 'Certifications' },
  { href: '/dashboard/career-brief', label: 'Career Brief' },
  { href: '/dashboard/weekly-recap', label: 'Weekly Recap' },
  { href: '/dashboard/ai-tools/application-tracker', label: 'Applications' },
  { href: '/profile', label: 'Profile' },
];

export default function PortalNav() {
  const pathname = usePathname();
  const isPartnerRoute = pathname.startsWith('/partner');

  return (
    <nav className="portal-nav" aria-label="Member portal navigation">
      <div className="portal-nav-inner">
        <ul className="portal-nav-links">
          {PORTAL_LINKS.map(({ href, label }) => {
            let isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            if (href === '/dashboard/learning') {
              isActive =
                isActive ||
                pathname === '/resources' ||
                pathname.startsWith('/resources/');
            }
            if (href === '/dashboard/resources') {
              isActive = isActive || pathname.startsWith('/dashboard/resources');
            }
            return (
              <li key={href}>
                <Link href={href} className={isActive ? 'active' : undefined}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="portal-nav-actions">
          {isPartnerRoute && (
            <span
              style={{
                fontSize: '0.75rem',
                background: 'var(--color-accent)',
                color: 'white',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Partner View
            </span>
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
