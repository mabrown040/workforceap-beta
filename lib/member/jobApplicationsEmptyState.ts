/**
 * Empty-state copy for `/dashboard/job-applications` when the member has
 * no tracked applications yet. CTAs are real next steps (log one, or browse
 * the board) — not pep-talk.
 */
export const JOB_APPLICATIONS_EMPTY = {
  title: 'No applications yet',
  description:
    'Track roles you apply to—add one manually or apply from the job board.',
  primaryCta: { label: 'Add application' },
  secondaryCta: { label: 'Browse jobs', href: '/dashboard/jobs' },
} as const;
