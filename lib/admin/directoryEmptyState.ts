/**
 * Admin partners / employers / subgroups directory empty copy.
 * Sentence-case, actionable CTAs — same kit contract as MENTORS_ADMIN_EMPTY.
 */

export const PARTNERS_DIRECTORY_EMPTY = {
  title: 'No partner organizations yet',
  description:
    'Add a partner so they can refer candidates, track milestones, and get a portal login.',
  primaryCta: { label: 'Add partner', href: '/admin/partners/new' },
} as const;

export const EMPLOYERS_DIRECTORY_EMPTY = {
  title: 'No employers in the directory',
  description:
    'Add a hiring partner to track open roles and hires from the employer portal.',
  primaryCta: { label: 'Add employer', href: '/admin/employers?ui=legacy#create' },
} as const;

export const SUBGROUPS_DIRECTORY_EMPTY = {
  title: 'No subgroups yet',
  description:
    'Create a subgroup so partners, managers, or churches can see their assigned members.',
  primaryCta: { label: 'New subgroup', href: '/admin/subgroups/new' },
} as const;
