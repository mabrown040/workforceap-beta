'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/members', label: 'Members', icon: '👥' },
  { href: '/admin/assessments', label: 'Assessments', icon: '📋' },
  { href: '/admin/programs', label: 'Programs', icon: '📚' },
  { href: '/admin/blog', label: 'Blog', icon: '📝' },
];

type AdminSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
            return (
              <li key={href} style={{ marginBottom: '0.25rem' }}>
                <Link
                  href={href}
                  className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
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
