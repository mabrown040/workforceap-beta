'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, GraduationCap, FileText, ClipboardList, User, Settings, Sparkles, BookMarked, BarChart3, CheckCircle } from 'lucide-react';

const SIDEBAR_LINKS: { href: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/dashboard/program', label: 'My Program', Icon: BookOpen },
  { href: '/dashboard/training', label: 'Training', Icon: GraduationCap },
  { href: '/ai-tools', label: 'AI Tools', Icon: Sparkles },
  { href: '/dashboard/resources', label: 'Resources', Icon: FileText },
  { href: '/career-brief', label: 'Career Brief', Icon: ClipboardList },
  { href: '/learning', label: 'Learning', Icon: BookMarked },
  { href: '/weekly-recap', label: 'Weekly Recap', Icon: BarChart3 },
  { href: '/dashboard/readiness', label: 'Career Readiness', Icon: CheckCircle },
  { href: '/dashboard/profile', label: 'My Profile', Icon: User },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
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
          {SIDEBAR_LINKS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`dashboard-sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="dashboard-sidebar-icon"><Icon size={20} className="text-current" /></span>
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
