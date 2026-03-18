'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/members', label: 'Members', icon: '👥' },
  { href: '/admin/assessments', label: 'Assessments', icon: '📋' },
  { href: '/admin/programs', label: 'Programs', icon: '📚' },
  { href: '/admin/blog', label: 'Blog', icon: '📝' },
  // COUNSELOR_DEFERRED: { href: '/admin/counselors', label: 'Counselors', icon: '👤' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '200px',
        minWidth: '200px',
        padding: '1rem 0',
        borderRight: '1px solid var(--color-border, #e5e5e5)',
        background: 'var(--color-light, #fafafa)',
      }}
    >
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
            return (
              <li key={href} style={{ marginBottom: '0.25rem' }}>
                <Link
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'inherit',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'rgba(74, 155, 79, 0.08)' : 'transparent',
                  }}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
