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
  { href: '/dashboard/readiness', label: 'Career Readiness', icon: '✅' },
  { href: '/dashboard/profile', label: 'My Profile', icon: '👤' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
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
          {SIDEBAR_LINKS.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`dashboard-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="dashboard-sidebar-icon">{icon}</span>
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
