'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { BarChart3, Users, ClipboardList, BookOpen, FileText, Handshake, Sparkles, Award, UsersRound, Mail, Briefcase, Building2, Activity } from 'lucide-react';
import { ADMIN_NAV } from '@/lib/nav/workspaceCopy';

const ICONS = {
  '/admin': BarChart3,
  '/admin/members': Users,
  '/admin/invites': Mail,
  '/admin/assessments': ClipboardList,
  '/admin/programs': BookOpen,
  '/admin/blog': FileText,
  '/admin/jobs': Briefcase,
  '/admin/employers': Building2,
  '/admin/partners': Handshake,
  '/admin/subgroups': UsersRound,
  '/admin/pipeline': BarChart3,
  '/admin/diagnostics': Activity,
  '/admin/weekly-recap': BarChart3,
  '/admin/ai-tools': Sparkles,
  '/admin/certifications': Award,
} as const;

const LINKS = ADMIN_NAV.map(({ href, label }) => ({ href, label, Icon: ICONS[href as keyof typeof ICONS] }));

type AdminSidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const onEscape = useCallback(() => onClose?.(), [onClose]);
  const trapRef = useFocusTrap(open, onEscape);

  return (
    <aside ref={trapRef} className={`admin-sidebar ${open ? 'open' : ''}`}>
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
                  <span className="admin-sidebar-icon-wrap" aria-hidden>
                    <Icon size={18} className="admin-sidebar-icon" strokeWidth={2} />
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
