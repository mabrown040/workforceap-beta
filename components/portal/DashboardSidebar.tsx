'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  Home,
  BookOpen,
  GraduationCap,
  Library,
  Sparkles,
  ClipboardList,
  BarChart3,
  CheckCircle,
  ClipboardCheck,
  User,
  Settings,
  LogOut,
  FileText,
  Award,
  Layers,
} from 'lucide-react';
import { SignOutButton } from '@/components/portal/SignOutButton';

const SIDEBAR_CORE = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/dashboard/program', label: 'My Program', Icon: BookOpen },
  { href: '/dashboard/training', label: 'Training', Icon: GraduationCap },
];

const SIDEBAR_TOOLS = [
  { href: '/dashboard/learning', label: 'Learning hub', Icon: Library },
  { href: '/dashboard/resources', label: 'Program resources', Icon: Layers },
  { href: '/dashboard/ai-tools', label: 'AI Tools', Icon: Sparkles },
  { href: '/dashboard/ai-tools/application-tracker', label: 'Applications', Icon: FileText },
  { href: '/dashboard/readiness', label: 'Career Readiness', Icon: CheckCircle },
  { href: '/dashboard/career-brief', label: 'Career Brief', Icon: ClipboardList },
  { href: '/dashboard/assessments', label: 'Skills Assessment', Icon: ClipboardCheck },
];

const SIDEBAR_MORE = [
  { href: '/certifications', label: 'Certifications', Icon: Award },
  { href: '/dashboard/weekly-recap', label: 'Weekly Recap', Icon: BarChart3 },
  { href: '/dashboard/profile', label: 'Profile', Icon: User },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
];

type DashboardSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function DashboardSidebar({ open = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onEscape = useCallback(() => onClose?.(), [onClose]);
  const trapRef = useFocusTrap(open, onEscape);

  const renderLink = (href: string, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>) => {
    let isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    if (href === '/dashboard/learning') {
      isActive =
        isActive ||
        pathname.startsWith('/resources') ||
        pathname.startsWith('/resources/');
    }
    if (href === '/dashboard/resources') {
      isActive = isActive || pathname.startsWith('/dashboard/resources');
    }
    return (
      <li key={href}>
        <Link
          href={href}
          className={`dashboard-sidebar-link ${isActive ? 'active' : ''}`}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            void router.push(href);
            queueMicrotask(() => onClose?.());
          }}
        >
          <span className="dashboard-sidebar-icon">
            <Icon size={20} className="text-current" />
          </span>
          {label}
        </Link>
      </li>
    );
  };

  return (
    <aside id="dashboard-member-drawer" ref={trapRef} className={`dashboard-sidebar ${open ? 'open' : ''}`}>
      <div className="dashboard-sidebar-inner">
        <nav aria-label="Dashboard navigation" className="dashboard-sidebar-nav">
          <ul className="dashboard-sidebar-list">
            {SIDEBAR_CORE.map(({ href, label, Icon }) => renderLink(href, label, Icon))}
            <li className="dashboard-sidebar-group-label">Tools</li>
            {SIDEBAR_TOOLS.map(({ href, label, Icon }) => renderLink(href, label, Icon))}
            <li className="dashboard-sidebar-group-label">More</li>
            {SIDEBAR_MORE.map(({ href, label, Icon }) => renderLink(href, label, Icon))}
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
