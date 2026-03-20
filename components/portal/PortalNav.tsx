'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

const PORTAL_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/ai-tools', label: 'AI Tools' },
  { href: '/resources', label: 'Resources' },
  { href: '/dashboard/learning', label: 'Learning' },
  { href: '/certifications', label: 'Certifications' },
  { href: '/dashboard/career-brief', label: 'Career Brief' },
  { href: '/dashboard/weekly-recap', label: 'Weekly Recap' },
  { href: '/dashboard/ai-tools/application-tracker', label: 'Applications' },
  { href: '/profile', label: 'Profile' },
];

export default function PortalNav() {
  const pathname = usePathname();

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
          <Link href="/" className="portal-nav-home">
            WorkforceAP
          </Link>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
