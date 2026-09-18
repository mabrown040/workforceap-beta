/**
 * Shared English empty-state copy for counselor inbox zero + member messages.
 * Keep titles short; CTAs are real next steps (kit KitEmptyState action slot).
 * Localized surfaces use matching keys under messages/{locale}/counselor.
 */
export const COUNSELOR_INBOX_ZERO_EMPTY = {
  title: 'Inbox zero',
  description:
    'No assigned members need attention today. Dismissed members stay hidden until tomorrow.',
  primaryCta: 'Open messages',
  secondaryCta: 'Back to dashboard',
  primaryHref: '/counselor/messages',
  secondaryHref: '/counselor',
} as const;

export const COUNSELOR_MESSAGES_NO_MEMBERS_EMPTY = {
  title: 'No members assigned yet',
  description: 'Members appear here once an admin assigns them to you.',
  primaryCta: 'Browse all members',
  secondaryCta: 'Back to dashboard',
  primaryHref: '/counselor/students',
  secondaryHref: '/counselor',
} as const;

export const COUNSELOR_MESSAGES_FILTER_EMPTY = {
  title: 'No conversations match',
  description: 'Try another filter or search term.',
  clearCta: 'Clear filters',
} as const;
