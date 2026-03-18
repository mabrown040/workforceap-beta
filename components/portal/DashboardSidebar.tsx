'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/program', label: 'My Program', icon: '📚' },
  { href: '/dashboard/training', label: 'Training', icon: '🎓' },
  { href: '/ai-tools', label: 'AI Tools', icon: '✨' },
  { href: '/dashboard/resources', label: 'Resources', icon: '📄' },
  { href: '/career-brief', label: 'Career Brief', icon: '📋' },
  { href: '/learning', label: 'Learning', icon: '📖' },
  { href: '/weekly-recap', label: 'Weekly Recap', icon: '📊' },
  { href: '/dashboard/profile', label: 'My Profile', icon: '👤' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="dashboard-sidebar"
      style={{
        width: '220px',
        minWidth: '220px',
        padding: '1.5rem 0',
        borderRight: '1px solid var(--color-border, #e5e5e5)',
        background: 'var(--color-light, #fafafa)',
      }}
    >
      <nav aria-label="Dashboard navigation">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {SIDEBAR_LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href} style={{ marginBottom: '0.25rem' }}>
                <Link
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-sm, 6px)',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-gray-800)',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'rgba(74, 155, 79, 0.08)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{icon}</span>
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
