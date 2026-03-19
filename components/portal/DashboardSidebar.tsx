'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_ICONS } from '@/lib/content/programIcons';

const SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/program', label: 'My Program' },
  { href: '/dashboard/training', label: 'Training' },
  { href: '/ai-tools', label: 'AI Tools' },
  { href: '/dashboard/resources', label: 'Resources' },
  { href: '/career-brief', label: 'Career Brief' },
  { href: '/learning', label: 'Learning' },
  { href: '/weekly-recap', label: 'Weekly Recap' },
  { href: '/dashboard/readiness', label: 'Career Readiness' },
  { href: '/dashboard/profile', label: 'My Profile' },
  { href: '/dashboard/settings', label: 'Settings' },
];

type DashboardSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function DashboardSidebar({ open = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`dashboard-sidebar ${open ? 'open' : ''}`}>
      <nav aria-label="Dashboard navigation">
        <ul className="dashboard-sidebar-list">
          {SIDEBAR_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const Icon = SIDEBAR_ICONS[label];
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`dashboard-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="dashboard-sidebar-icon">
                    {Icon ? <Icon size={20} className="text-current" /> : null}
                  </span>
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
