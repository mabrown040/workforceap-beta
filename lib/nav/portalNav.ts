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
  HelpCircle,
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

export type PortalRole = 'member' | 'employer' | 'partner' | 'admin' | 'group' | 'counselor';

export type NavGroup = 'primary' | 'workflows' | 'insights' | 'manage';

export type NavBadgeKey =
  | 'jobs_draft'
  | 'jobs_pending'
  | 'jobs_live'
  | 'applications_new'
  | 'partner_needs_attention'
  | 'milestones_new'
  | 'counselor_messages_unread'
  | 'counselor_sla_breach_48h'
  | 'employer_queue_review_today'
  | 'employer_queue_stale_48h'
  | 'employer_queue_interview'
  | 'employer_messages_unread'
  | 'partner_messages_unread';

export type PortalNavItem = {
  href: string;
  label: string;
  group: NavGroup;
  Icon?: LucideIcon;
  aliases?: string[];
  /** `data-tour` id for first-login tooltip tour (Sprint 8c) */
  tourTarget?: string;
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
  { href: '/dashboard', label: 'Overview', group: 'primary', Icon: Home, tourTarget: 'tour-dashboard' },
  { href: '/dashboard/program', label: 'My Program', group: 'primary', Icon: BookOpen, tourTarget: 'tour-programs' },
  { href: '/dashboard/training', label: 'Training', group: 'primary', Icon: GraduationCap },
  {
    href: '/dashboard/learning',
    label: 'Learning hub',
    group: 'workflows',
    Icon: Library,
    aliases: ['/resources'],
    tourTarget: 'tour-learning',
  },
  {
    href: '/jobs',
    label: 'Job board',
    group: 'workflows',
    Icon: Briefcase,
    tourTarget: 'tour-jobs',
  },
  { href: '/dashboard/resources', label: 'Program resources', group: 'workflows', Icon: Layers, tourTarget: 'tour-resources' },
  { href: '/dashboard/resume', label: 'Resume', group: 'workflows', Icon: FileText },
  { href: '/dashboard/ai-tools', label: 'AI tools', group: 'workflows', Icon: Sparkles, tourTarget: 'tour-ai-tools' },
  {
    href: '/dashboard/ai-tools/application-tracker',
    label: 'Job Applications',
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
    tourTarget: 'tour-messages',
  },
  { href: '/dashboard/readiness', label: 'Career readiness', group: 'insights', Icon: CheckCircle },
  { href: '/dashboard/assessments', label: 'Skills assessment', group: 'insights', Icon: ClipboardCheck },
  { href: '/dashboard/weekly-recap', label: 'Weekly recap', group: 'insights', Icon: BarChart3 },
  { href: '/dashboard/career-brief', label: 'Career Brief', group: 'insights', Icon: ClipboardList },
  { href: '/dashboard/certifications', label: 'Certifications', group: 'manage', Icon: Award, aliases: ['/certifications'] },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    group: 'manage',
    Icon: User,
    aliases: ['/profile'],
    tourTarget: 'tour-profile',
  },
  { href: '/dashboard/settings', label: 'Settings', group: 'manage', Icon: Settings },
  { href: '/dashboard/guide', label: 'Member guide', group: 'manage', Icon: HelpCircle },
];

export const EMPLOYER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/employer', label: 'Overview', group: 'primary', Icon: LayoutDashboard, tourTarget: 'tour-overview' },
  {
    href: '/employer/work-queue',
    label: 'Work queue',
    group: 'workflows',
    Icon: ListChecks,
    tourTarget: 'tour-work-queue',
    badgeKeys: ['employer_queue_review_today', 'employer_queue_stale_48h', 'employer_queue_interview'],
  },
  {
    href: '/employer/jobs',
    label: 'Jobs',
    group: 'workflows',
    Icon: Briefcase,
    tourTarget: 'tour-jobs',
    badgeKeys: ['jobs_draft', 'jobs_pending'],
  },
  { href: '/employer/jobs/new', label: 'Post job', group: 'workflows', Icon: PlusCircle },
  { href: '/employer/jobs/import', label: 'Imports', group: 'workflows', Icon: Upload },
  {
    href: '/employer/applications',
    label: 'Applicants',
    group: 'workflows',
    Icon: Users,
    tourTarget: 'tour-applicants',
    badgeKey: 'applications_new',
  },
  { href: '/employer/matches', label: 'Match history', group: 'workflows', Icon: Sparkles, tourTarget: 'tour-matches' },
  { href: '/employer/pipeline', label: 'Candidate pipeline', group: 'workflows', Icon: GitBranch, tourTarget: 'tour-pipeline' },
  {
    href: '/employer/messages',
    label: 'Messages',
    group: 'manage',
    Icon: MessageSquare,
    tourTarget: 'tour-messages',
    badgeKey: 'employer_messages_unread',
  },
  { href: '/employer/settings', label: 'Company settings', group: 'manage', Icon: Settings },
  { href: '/employer/guide', label: 'How it works', group: 'manage', Icon: HelpCircle },
];

export const PARTNER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/partner', label: 'Overview', group: 'primary', Icon: LayoutDashboard, tourTarget: 'tour-overview' },
  {
    href: '/partner/members',
    label: 'Referred members',
    group: 'workflows',
    Icon: Users,
    tourTarget: 'tour-members',
    badgeKey: 'partner_needs_attention',
  },
  {
    href: '/partner/attention',
    label: 'Attention queue',
    group: 'workflows',
    Icon: AlertTriangle,
    tourTarget: 'tour-attention',
  },
  {
    href: '/partner/milestones',
    label: 'Milestones',
    group: 'workflows',
    Icon: Flag,
    badgeKey: 'milestones_new',
  },
  { href: '/partner/guide', label: 'Referral guide', group: 'workflows', Icon: ClipboardList },
  { href: '/partner/outcomes', label: 'Outcomes snapshot', group: 'insights', Icon: BarChart3, tourTarget: 'tour-outcomes' },
  { href: '/partner/resources', label: 'Partner resources', group: 'manage', Icon: Layers },
  { href: '/partner/exports', label: 'Exports', group: 'manage', Icon: Download },
  {
    href: '/partner/messages',
    label: 'Messages',
    group: 'manage',
    Icon: MessageSquare,
    tourTarget: 'tour-messages',
    badgeKey: 'partner_messages_unread',
  },
  { href: '/partner/settings', label: 'Settings', group: 'manage', Icon: Settings },
];

/** @deprecated Subgroup leader UI removed; keep empty for typing */
export const GROUP_PORTAL_NAV_ITEMS: PortalNavItem[] = [];

/** Admin ops — same WorkspaceShell grouping pattern as employer/partner/member. */
export const ADMIN_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/admin', label: 'Overview', group: 'primary', Icon: BarChart3 },
  {
    href: '/admin/messages',
    label: 'Counselor messages',
    group: 'workflows',
    Icon: MessageSquare,
    requiresSuperAdminContext: true,
    badgeKey: 'counselor_sla_breach_48h',
  },
  { href: '/admin/members', label: 'Members', group: 'workflows', Icon: Users },
  { href: '/admin/members/interview-ready', label: 'Interview ready', group: 'workflows', Icon: ListChecks },
  { href: '/admin/invites', label: 'Invites', group: 'workflows', Icon: MessageSquare },
  { href: '/admin/assessments', label: 'Assessments', group: 'workflows', Icon: ClipboardCheck },
  { href: '/admin/programs', label: 'Programs', group: 'workflows', Icon: BookOpen },
  { href: '/admin/settings', label: 'Settings', group: 'manage', Icon: Settings },
  { href: '/admin/blog', label: 'Blog', group: 'workflows', Icon: FileText },
  { href: '/admin/jobs', label: 'Jobs', group: 'workflows', Icon: Briefcase },
  { href: '/admin/employers', label: 'Employers', group: 'workflows', Icon: Building2 },
  { href: '/admin/counselors', label: 'Counselors', group: 'workflows', Icon: Users },
  { href: '/admin/partners', label: 'Partners', group: 'workflows', Icon: Handshake },
  { href: '/admin/subgroups', label: 'Subgroups', group: 'workflows', Icon: UsersRound },
  { href: '/admin/pipeline', label: 'Pipeline', group: 'workflows', Icon: GitBranch },
  { href: '/admin/diagnostics', label: 'Diagnostics', group: 'insights', Icon: Activity },
  { href: '/admin/weekly-recap', label: 'Weekly recap', group: 'insights', Icon: BarChart3 },
  { href: '/admin/ai-tools', label: 'AI tools', group: 'insights', Icon: Sparkles },
  { href: '/admin/certifications', label: 'Certifications', group: 'insights', Icon: Award },
];

export const COUNSELOR_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/counselor', label: 'Overview', group: 'primary', Icon: Home },
  { href: '/counselor/students', label: 'My students', group: 'workflows', Icon: Users },
  { href: '/counselor/messages', label: 'Messages', group: 'workflows', Icon: MessageSquare },
  { href: '/counselor/resources', label: 'Resources', group: 'manage', Icon: BookOpen },
  { href: '/counselor/guide', label: 'Portal guide', group: 'manage', Icon: HelpCircle },
];

export const PORTAL_NAV: Record<PortalRole, PortalNavItem[]> = {
  member: MEMBER_PORTAL_NAV_ITEMS,
  employer: EMPLOYER_PORTAL_NAV_ITEMS,
  partner: PARTNER_PORTAL_NAV_ITEMS,
  group: GROUP_PORTAL_NAV_ITEMS,
  admin: ADMIN_PORTAL_NAV_ITEMS,
  counselor: COUNSELOR_PORTAL_NAV_ITEMS,
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
