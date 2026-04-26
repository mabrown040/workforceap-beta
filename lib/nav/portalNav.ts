import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Compass,
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
  LineChart,
  Library,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Settings,
  Shield,
  Sparkles,
  Target,
  Upload,
  User,
  Users,
  UsersRound,
} from 'lucide-react';

export type PortalRole = 'member' | 'employer' | 'partner' | 'admin' | 'group' | 'counselor';

export type NavGroup = 'primary' | 'workflows' | 'people' | 'pipeline' | 'content' | 'insights' | 'manage';

export type NavTab = 'journey' | 'program' | 'jobs' | 'me';

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
  /** Top-level workspace tab (member portal only for now) */
  tab?: NavTab;
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

export const NAV_TAB_META: Record<NavTab, { label: string; icon: string }> = {
  journey: { label: 'Home', icon: 'home' },
  program: { label: 'My Program', icon: 'school' },
  jobs: { label: 'Jobs', icon: 'work' },
  me: { label: 'AI Toolkit', icon: 'auto_awesome' },
};

export const NAV_TAB_ORDER: NavTab[] = ['journey', 'program', 'jobs', 'me'];

export const NAV_GROUP_LABELS: Record<NavGroup, string | null> = {
  primary: null,
  workflows: 'Workflows',
  people: 'People',
  pipeline: 'Pipeline',
  content: 'Content',
  insights: 'Insights',
  manage: 'Manage',
};

export const GROUP_ORDER: NavGroup[] = ['primary', 'people', 'pipeline', 'content', 'workflows', 'insights', 'manage'];

const WIOA_AVAILABLE = process.env.NEXT_PUBLIC_WIOA_ENABLED === '1';

export const MEMBER_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  // ── Home tab ──
  { href: '/dashboard', label: 'Home', group: 'primary', tab: 'journey', Icon: Home, tourTarget: 'tour-dashboard' },
  // ── Program tab ──
  { href: '/dashboard/program', label: 'My Program', group: 'primary', tab: 'program', Icon: BookOpen, tourTarget: 'tour-programs' },
  { href: '/dashboard/training', label: 'My Classes', group: 'primary', tab: 'program', Icon: GraduationCap },
  { href: '/dashboard/certifications', label: 'My Certificates', group: 'manage', tab: 'program', Icon: Award, aliases: ['/certifications'] },
  { href: '/dashboard/career-brief', label: 'My Career Plan', group: 'insights', tab: 'program', Icon: ClipboardList },
  ...(WIOA_AVAILABLE
    ? [
        {
          href: '/dashboard/learning/wioa-qualification',
          label: 'Funding Eligibility',
          group: 'insights',
          tab: 'program',
          Icon: Shield,
        } as PortalNavItem,
      ]
    : []),
  // ── Jobs tab ──
  {
    href: '/dashboard/jobs',
    label: 'Job Board',
    group: 'workflows',
    tab: 'jobs',
    Icon: Briefcase,
    tourTarget: 'tour-jobs',
  },
  {
    href: '/dashboard/job-applications',
    label: 'Job Applications',
    group: 'workflows',
    tab: 'jobs',
    Icon: FileText,
    aliases: ['/dashboard/ai-tools/application-tracker', '/applications'],
    badgeKey: 'applications_new',
  },
  { href: '/dashboard/resume', label: 'Resume', group: 'workflows', tab: 'jobs', Icon: FileText },
  { href: '/dashboard/readiness', label: 'My Progress', group: 'insights', tab: 'jobs', Icon: CheckCircle },
  // ── Tools tab ──
  { href: '/dashboard/ai-tools', label: 'AI Toolkit', group: 'workflows', tab: 'me', Icon: Sparkles, tourTarget: 'tour-ai-tools' },
  {
    href: '/dashboard/learning',
    label: 'Learning Hub',
    group: 'workflows',
    tab: 'me',
    Icon: Library,
    aliases: ['/resources', '/dashboard/career-library'],
    tourTarget: 'tour-learning',
  },
  {
    href: '/dashboard/learning/find-your-career',
    label: 'Find your career',
    group: 'workflows',
    tab: 'me',
    Icon: Compass,
    aliases: ['/dashboard/learning/interest-profiler'],
  },
  {
    href: '/dashboard/skills-assessment',
    label: 'Skills Assessment',
    group: 'insights',
    tab: 'me',
    Icon: ClipboardCheck,
    aliases: ['/dashboard/assessments', '/dashboard/assessment'],
  },
  // ── Profile tab ──
  { href: '/dashboard/weekly-recap', label: 'Weekly Recap', group: 'insights', tab: 'journey', Icon: BarChart3 },
  {
    href: '/dashboard/messages',
    label: 'My Counselor',
    group: 'primary',
    tab: 'journey',
    Icon: MessageSquare,
    badgeKey: 'counselor_messages_unread',
    tourTarget: 'tour-messages',
  },
  { href: '/dashboard/resources', label: 'Resources', group: 'workflows', tab: 'me', Icon: Layers, tourTarget: 'tour-resources' },
  {
    href: '/dashboard/help',
    label: 'Help & Support',
    group: 'manage',
    tab: 'me',
    Icon: HelpCircle,
    aliases: ['/help'],
  },
  { href: '/dashboard/guide', label: 'Member Guide', group: 'manage', tab: 'me', Icon: BookOpen },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    group: 'manage',
    tab: 'me',
    Icon: User,
    aliases: ['/profile', '/account'],
    tourTarget: 'tour-profile',
  },
  { href: '/dashboard/settings', label: 'My Account', group: 'manage', tab: 'me', Icon: Settings },
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
    href: '/partner/referred-members',
    label: 'Referred members',
    group: 'workflows',
    Icon: Users,
    tourTarget: 'tour-members',
    aliases: ['/partner/members'],
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

/** Admin ops — grouped by function so the sidebar is scannable at a glance. */
export const ADMIN_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  // ── Primary ──
  { href: '/admin', label: 'Overview', group: 'primary', Icon: BarChart3 },

  // ── People — everyone in the system ──
  { href: '/admin/members', label: 'Members', group: 'people', Icon: Users },
  { href: '/admin/users', label: 'Users', group: 'people', Icon: User },
  { href: '/admin/employers', label: 'Employers', group: 'people', Icon: Building2 },
  { href: '/admin/partners', label: 'Partners', group: 'people', Icon: Handshake },
  { href: '/admin/counselors', label: 'Counselors', group: 'people', Icon: Users },
  { href: '/admin/subgroups', label: 'Subgroups', group: 'people', Icon: UsersRound },
  { href: '/admin/mentors', label: 'Mentors', group: 'people', Icon: GraduationCap },
  {
    href: '/admin/messages',
    label: 'Messages',
    group: 'people',
    Icon: MessageSquare,
    requiresSuperAdminContext: true,
    badgeKey: 'counselor_sla_breach_48h',
  },

  // ── Pipeline — training, progress, outcomes ──
  { href: '/admin/pipeline', label: 'Pipeline', group: 'pipeline', Icon: GitBranch },
  { href: '/admin/members/interview-ready', label: 'Job ready', group: 'pipeline', Icon: ListChecks },
  { href: '/admin/programs', label: 'Programs', group: 'pipeline', Icon: BookOpen },
  {
    href: '/admin/program-change-requests',
    label: 'Program requests',
    group: 'pipeline',
    Icon: ArrowLeftRight,
  },
  { href: '/admin/assessments', label: 'Assessments', group: 'pipeline', Icon: ClipboardCheck },
  { href: '/admin/wioa-screening', label: 'Funding eligibility', group: 'pipeline', Icon: ClipboardList },
  { href: '/admin/career-mappings', label: 'Career paths', group: 'pipeline', Icon: Target },
  { href: '/admin/certifications', label: 'Certificates', group: 'pipeline', Icon: Award },

  // ── Workflows — admin-as-counselor force multiplier ──
  // In-office sessions live under /counselor/* (the page accepts admin
  // auth). Admins routinely sit with members too; this entry shortcuts
  // there from the admin sidebar. See PR #743 + /plan-ceo-review (2026-04-26).
  { href: '/counselor/sessions', label: 'In-office sessions', group: 'workflows', Icon: Sparkles },

  // ── Content — jobs, blog, invites ──
  { href: '/admin/jobs', label: 'Jobs', group: 'content', Icon: Briefcase },
  { href: '/admin/blog', label: 'Blog', group: 'content', Icon: FileText },
  { href: '/admin/invites', label: 'Invites', group: 'content', Icon: MessageSquare },

  // ── Insights — metrics and reporting ──
  { href: '/admin/exports', label: 'Exports', group: 'insights', Icon: Download },
  { href: '/admin/coursera', label: 'Coursera', group: 'insights', Icon: Library },
  { href: '/admin/metrics', label: 'Metrics', group: 'insights', Icon: LineChart },
  { href: '/admin/weekly-recap', label: 'Weekly recap', group: 'insights', Icon: BarChart3 },
  { href: '/admin/ai-tools', label: 'AI tools', group: 'insights', Icon: Sparkles },
  { href: '/admin/diagnostics', label: 'Diagnostics', group: 'insights', Icon: Activity },
  { href: '/admin/audit-logs', label: 'Audit logs', group: 'insights', Icon: Shield, requiresSuperAdminContext: true },
  { href: '/admin/email-crons', label: 'Email & Crons', group: 'insights', Icon: MessageSquare },

  // ── Manage ──
  { href: '/admin/settings', label: 'Settings', group: 'manage', Icon: Settings },
];

export const COUNSELOR_PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: '/counselor', label: 'Overview', group: 'primary', Icon: Home },
  { href: '/counselor/students', label: 'My members', group: 'workflows', Icon: Users },
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

/** Given a pathname, determine which tab is active. Falls back to 'journey'. */
export function getActiveTab(pathname: string, items: PortalNavItem[]): NavTab {
  // Find the most specific matching item
  let best: PortalNavItem | undefined;
  let bestLen = 0;
  for (const item of items) {
    if (!item.tab) continue;
    const candidates = [item.href, ...(item.aliases ?? [])];
    for (const c of candidates) {
      if ((pathname === c || pathname.startsWith(c + '/')) && c.length > bestLen) {
        best = item;
        bestLen = c.length;
      }
    }
  }
  return best?.tab ?? 'journey';
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
