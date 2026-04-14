export const PRODUCT_COPY = {
  publicSiteLabel: 'WorkforceAP site',
  memberWorkspace: 'Member portal',
  employerWorkspace: 'Employer portal',
  partnerWorkspace: 'Partner portal',
  counselorWorkspace: 'Counselor portal',
  groupWorkspace: 'Group portal',
  adminWorkspace: 'Admin workspace',
} as const;

export const EMPLOYER_PORTAL_NAV = [
  { href: '/employer', label: 'Overview' },
  { href: '/employer/jobs', label: 'Jobs' },
  { href: '/employer/applications', label: 'Applicants' },
  { href: '/employer/jobs/new', label: 'Post a job' },
] as const;

export const PARTNER_PORTAL_NAV = [
  { href: '/partner', label: 'Overview' },
  { href: '/partner/guide', label: 'Referral guide' },
  { href: '/partner/resources', label: 'Partner resources' },
] as const;

export const GROUP_PORTAL_NAV = [] as const;

export const ADMIN_NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/invites', label: 'Invites' },
  { href: '/admin/assessments', label: 'Assessments' },
  { href: '/admin/programs', label: 'Programs' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/employers', label: 'Employers' },
  { href: '/admin/partners', label: 'Partners' },
  { href: '/admin/subgroups', label: 'Subgroups' },
  { href: '/admin/pipeline', label: 'Pipeline' },
  { href: '/admin/diagnostics', label: 'Diagnostics' },
  { href: '/admin/weekly-recap', label: 'Weekly recap' },
  { href: '/admin/ai-tools', label: 'AI tools' },
  { href: '/admin/certifications', label: 'Certificates' },
] as const;
