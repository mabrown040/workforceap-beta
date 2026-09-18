/**
 * Empty-state copy when no approved/active mentors are listable
 * (`GET /api/mentors` → `total: 0`, member `/dashboard/mentors`).
 * Keep lines short enough to read on a phone; CTAs are real next steps.
 */
export const MENTORS_MEMBER_EMPTY = {
  statusLabel: 'Not live yet',
  /** Kit `StatusTag` tone — keep as `'warn'` (not live / needs attention). */
  statusTone: 'warn' as const,
  title: 'No mentors to request yet',
  description:
    'Ask your counselor when you need mentoring. Until mentors are approved, keep training and job search moving.',
  primaryCta: { label: 'Message counselor', href: '/dashboard/messages' },
  secondaryCta: { label: 'Browse jobs', href: '/dashboard/jobs' },
  lede: 'Mentoring opens after staff approve volunteers. Use counselor support until then.',
} as const;

/** Admin directory empty — activation path, not pep-talk. */
export const MENTORS_ADMIN_EMPTY = {
  title: 'No mentors in the directory',
  description:
    'Share the mentor apply link, review applications, then approve to make mentors visible to members.',
  primaryCta: { label: 'Open mentor apply', href: '/mentor/apply' },
} as const;
