'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  GraduationCap,
  Sparkles,
  FileText,
  ClipboardList,
  BarChart3,
  CheckCircle,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { SignOutButton } from '@/components/portal/SignOutButton';

const SIDEBAR_LINKS = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/dashboard/program', label: 'My Program', Icon: BookOpen },
  { href: '/dashboard/training', label: 'Training', Icon: GraduationCap },
  { href: '/dashboard/ai-tools', label: 'AI Tools', Icon: Sparkles },
  { href: '/dashboard/resources', label: 'Resources', Icon: FileText },
  { href: '/dashboard/career-brief', label: 'Career Brief', Icon: ClipboardList },
  { href: '/dashboard/learning', label: 'Learning', Icon: BookOpen },
  { href: '/dashboard/weekly-recap', label: 'Weekly Recap', Icon: BarChart3 },
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
      <div className="dashboard-sidebar-inner">
        <nav aria-label="Dashboard navigation" className="dashboard-sidebar-nav">
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
                    <span className="dashboard-sidebar-icon">
                      <Icon size={20} className="text-current" />
                    </span>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="dashboard-sidebar-footer">
          <SignOutButton className="dashboard-sidebar-signout" onSignOutStart={onClose}>
            <LogOut size={18} strokeWidth={2} aria-hidden />
            Sign out
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
