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
  FileText,
  Award,
  Layers,
  type LucideIcon,
} from 'lucide-react';

export type MemberPortalNavItem = {
  href: string;
  label: string;
  group: 'core' | 'tools' | 'more';
  Icon?: LucideIcon;
  aliases?: string[];
};

export const MEMBER_PORTAL_NAV: MemberPortalNavItem[] = [
  { href: '/dashboard', label: 'Overview', group: 'core', Icon: Home },
  { href: '/dashboard/program', label: 'My Program', group: 'core', Icon: BookOpen },
  { href: '/dashboard/training', label: 'Training', group: 'core', Icon: GraduationCap },
  { href: '/dashboard/learning', label: 'Learning hub', group: 'tools', Icon: Library, aliases: ['/resources'] },
  { href: '/dashboard/resources', label: 'Program resources', group: 'tools', Icon: Layers },
  { href: '/dashboard/ai-tools', label: 'AI tools', group: 'tools', Icon: Sparkles },
  {
    href: '/dashboard/job-applications',
    label: 'Applications',
    group: 'tools',
    Icon: FileText,
    aliases: ['/dashboard/ai-tools/application-tracker', '/applications'],
  },
  { href: '/dashboard/readiness', label: 'Career readiness', group: 'tools', Icon: CheckCircle },
  {
    href: '/dashboard/skills-assessment',
    label: 'Skills assessment',
    group: 'tools',
    Icon: ClipboardCheck,
    aliases: ['/dashboard/assessments', '/dashboard/assessment'],
  },
  { href: '/certifications', label: 'Certificates', group: 'more', Icon: Award },
  { href: '/dashboard/career-brief', label: 'Career Brief', group: 'more', Icon: ClipboardList },
  { href: '/dashboard/weekly-recap', label: 'Weekly recap', group: 'more', Icon: BarChart3 },
  { href: '/profile', label: 'Profile', group: 'more', Icon: User },
  { href: '/dashboard/settings', label: 'Settings', group: 'more', Icon: Settings },
];
