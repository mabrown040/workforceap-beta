'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, ClipboardList, BookOpen, FileText, Handshake } from 'lucide-react';

const LINKS = [
  { href: '/admin', label: 'Overview', Icon: BarChart3 },
  { href: '/admin/members', label: 'Members', Icon: Users },
  { href: '/admin/assessments', label: 'Assessments', Icon: ClipboardList },
  { href: '/admin/programs', label: 'Programs', Icon: BookOpen },
  { href: '/admin/blog', label: 'Blog', Icon: FileText },
  { href: '/admin/partners', label: 'Partners', Icon: Handshake },
  { href: '/admin/pipeline', label: 'Pipeline', Icon: BarChart3 },
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
          {LINKS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
            return (
              <li key={href} style={{ marginBottom: '0.25rem' }}>
                <Link
                  href={href}
                  className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span><Icon size={20} className="text-current" /></span>
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


