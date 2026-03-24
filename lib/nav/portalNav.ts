import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  Flag,
  GitBranch,
  GraduationCap,
  Handshake,
  Home,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Settings,
  Sparkles,
  Upload,
  User,
  Users,
  UsersRound,
} from 'lucide-react';

export type PortalRole = 'member' | 'employer' | 'partner' | 'admin' | 'group';

export type NavGroup = 'primary' | 'workflows' | 'insights' | 'manage';

export type NavBadgeKey =
  | 'jobs_draft'
  | 'jobs_pending'
  | 'jobs_live'
  | 'applications_new'
  | 'partner_needs_attention'
  | 'milestones_new'
  | 'readiness_incomplete'
  | 'counselor_messages_unread'
  | 'employer_queue_review_today'
  | 'employer_queue_stale_48h'
  | 'employer_queue_interview';

export type PortalNavItem = {
  href: string;
  label: string;
  group: NavGroup;
  Icon?: LucideIcon;
  aliases?: string[];
  /** Single badge key from server map */
  badgeKey?: NavBadgeKey;
  /** Sum multiple keys (e.g. draft + pending on Jobs) */
  badgeKeys?: NavBadgeKey[];
  requiresSuperAdminContext?: boolean;
};

export const NAV_GROUP_LABELS: Record<NavGroup, string | null> = {
  primary: null,
  workflows: 'Workflows',
  insights: 'Insights',
  manage: 'Manage',
};

export const GROUP_ORDER: NavGroup[] = ['primary', 'workflows', 'insights', 'manage'];

export const MEMBER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/dashboard', label: 'Overview', group: 'primary', Icon: Home },
  { href: '/dashboard/program', label: 'My Program', group: 'primary', Icon: BookOpen },
  { href: '/dashboard/training', label: 'Training', group: 'primary', Icon: GraduationCap },
  {
    href: '/dashboard/learning',
    label: 'Learning hub',
    group: 'workflows',
    Icon: Library,
    aliases: ['/resources'],
  },
  { href: '/dashboard/resources', label: 'Program resources', group: 'workflows', Icon: Layers },
  { href: '/dashboard/ai-tools', label: 'AI tools', group: 'workflows', Icon: Sparkles },
  {
    href: '/dashboard/ai-tools/application-tracker',
    label: 'Applications',
    group: 'workflows',
    Icon: FileText,
    badgeKey: 'applications_new',
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    group: 'workflows',
    Icon: MessageSquare,
    badgeKey: 'counselor_messages_unread',
  },
  { href: '/dashboard/readiness', label: 'Career readiness', group: 'insights', Icon: CheckCircle, badgeKey: 'readiness_incomplete' },
  { href: '/dashboard/assessments', label: 'Skills assessment', group: 'insights', Icon: ClipboardCheck },
  { href: '/dashboard/weekly-recap', label: 'Weekly recap', group: 'insights', Icon: BarChart3 },
  { href: '/dashboard/career-brief', label: 'Career Brief', group: 'insights', Icon: ClipboardList },
  { href: '/dashboard/certifications', label: 'Certifications', group: 'manage', Icon: Award, aliases: ['/certifications'] },
  { href: '/dashboard/profile', label: 'Profile', group: 'manage', Icon: User, aliases: ['/profile'] },
  { href: '/dashboard/settings', label: 'Settings', group: 'manage', Icon: Settings },
];

export const EMPLOYER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/employer', label: 'Overview', group: 'primary', Icon: LayoutDashboard },
  {
    href: '/employer/work-queue',
    label: 'Work queue',
    group: 'workflows',
    Icon: ListChecks,
    badgeKeys: ['employer_queue_review_today', 'employer_queue_stale_48h', 'employer_queue_interview'],
  },
  {
    href: '/employer/jobs',
    label: 'Jobs',
    group: 'workflows',
    Icon: Briefcase,
    badgeKeys: ['jobs_draft', 'jobs_pending'],
  },
  { href: '/employer/jobs/new', label: 'Post job', group: 'workflows', Icon: PlusCircle },
  { href: '/employer/jobs/import', label: 'Imports', group: 'workflows', Icon: Upload },
  {
    href: '/employer/applications',
    label: 'Applicants',
    group: 'workflows',
    Icon: Users,
    badgeKey: 'applications_new',
  },
  { href: '/employer/matches', label: 'Match history', group: 'workflows', Icon: Sparkles },
  { href: '/employer/pipeline', label: 'Candidate pipeline', group: 'workflows', Icon: GitBranch },
  { href: '/employer/messages', label: 'Messages / support', group: 'manage', Icon: MessageSquare },
  { href: '/employer/settings', label: 'Company settings', group: 'manage', Icon: Settings },
];

export const PARTNER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/partner', label: 'Overview', group: 'primary', Icon: LayoutDashboard },
  {
    href: '/partner/members',
    label: 'Referred members',
    group: 'workflows',
    Icon: Users,
    badgeKey: 'partner_needs_attention',
  },
  {
    href: '/partner/attention',
    label: 'Attention queue',
    group: 'workflows',
    Icon: AlertTriangle,
  },
  {
    href: '/partner/milestones',
    label: 'Milestones',
    group: 'workflows',
    Icon: Flag,
    badgeKey: 'milestones_new',
  },
  { href: '/partner/guide', label: 'Referral guide', group: 'workflows', Icon: ClipboardList },
  { href: '/partner/outcomes', label: 'Outcomes snapshot', group: 'insights', Icon: BarChart3 },
  { href: '/partner/resources', label: 'Partner resources', group: 'manage', Icon: Layers },
  { href: '/partner/exports', label: 'Exports', group: 'manage', Icon: Download },
  { href: '/partner/settings', label: 'Settings', group: 'manage', Icon: Settings },
];

export const GROUP_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/my-group', label: 'Members', group: 'primary', Icon: Users },
];

/** Admin ops — same WorkspaceShell grouping pattern as employer/partner/member. */
export const ADMIN_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/admin', label: 'Overview', group: 'primary', Icon: BarChart3 },
  { href: '/admin/members', label: 'Members', group: 'workflows', Icon: Users },
  { href: '/admin/invites', label: 'Invites', group: 'workflows', Icon: MessageSquare },
  { href: '/admin/assessments', label: 'Assessments', group: 'workflows', Icon: ClipboardCheck },
  { href: '/admin/programs', label: 'Programs', group: 'workflows', Icon: BookOpen },
  { href: '/admin/blog', label: 'Blog', group: 'workflows', Icon: FileText },
  { href: '/admin/jobs', label: 'Jobs', group: 'workflows', Icon: Briefcase },
  { href: '/admin/employers', label: 'Employers', group: 'workflows', Icon: Building2 },
  { href: '/admin/partners', label: 'Partners', group: 'workflows', Icon: Handshake },
  { href: '/admin/subgroups', label: 'Subgroups', group: 'workflows', Icon: UsersRound },
  { href: '/admin/pipeline', label: 'Pipeline', group: 'workflows', Icon: GitBranch },
  { href: '/admin/diagnostics', label: 'Diagnostics', group: 'insights', Icon: Activity },
  { href: '/admin/weekly-recap', label: 'Weekly recap', group: 'insights', Icon: BarChart3 },
  { href: '/admin/ai-tools', label: 'AI tools', group: 'insights', Icon: Sparkles },
  { href: '/admin/certifications', label: 'Certifications', group: 'insights', Icon: Award },
];

export const PORTAL_NAV: Record<PortalRole, PortalNavItem[]> = {
  member: MEMBER_PORTAL_NAV_ITEMS,
  employer: EMPLOYER_PORTAL_NAV_ITEMS,
  partner: PARTNER_PORTAL_NAV_ITEMS,
  group: GROUP_PORTAL_NAV_ITEMS,
  admin: ADMIN_PORTAL_NAV_ITEMS,
};

export function navItemsForActiveRoute(items: PortalNavItem[]): { href: string; aliases?: string[] }[] {
  return items.map(({ href, aliases }) => ({ href, aliases }));
}

export function badgeTotalForItem(
  counts: Partial<Record<NavBadgeKey, number>>,
  item: PortalNavItem
): number {
  if (item.badgeKeys?.length) {
    return item.badgeKeys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  }
  if (item.badgeKey) return counts[item.badgeKey] ?? 0;
  return 0;
}
