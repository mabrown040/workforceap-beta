'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_SIDEBAR_ICONS } from '@/lib/content/programIcons';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/assessments', label: 'Assessments' },
  { href: '/admin/programs', label: 'Programs' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/partners', label: 'Partners' },
  { href: '/admin/pipeline', label: 'Pipeline' },
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
          {LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
            const Icon = ADMIN_SIDEBAR_ICONS[label];
            return (
              <li key={href} style={{ marginBottom: '0.25rem' }}>
                <Link
                  href={href}
                  className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span>{Icon ? <Icon size={18} className="text-current" /> : null}</span>
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


