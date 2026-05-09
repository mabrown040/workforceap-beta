import type { Prisma } from '@prisma/client';

const FIXTURE_EMAILS = ['member.success@workforceap.org', 'mbrown@hsconglomerates.com'];

/**
 * Strict member filter used by funder / grant exports (WIOA cohort CSV, etc.)
 * Only profile.role === 'member' rows count toward outcome reporting.
 */
export const MEMBER_ONLY_WHERE = {
  profile: { role: 'member' },
  email: { notIn: FIXTURE_EMAILS },
} satisfies Prisma.UserWhereInput;

/**
 * Member-or-dogfood-admin filter used by admin-facing surfaces (/admin/members,
 * /admin/pipeline, etc.). Includes:
 *  - any profile.role === 'member' (real members)
 *  - admin / super_admin accounts (dogfooders — they need to find themselves
 *    in the admin UI to test member surfaces with their own Coursera data)
 *
 * Funder-facing exports must keep using `MEMBER_ONLY_WHERE` so admin rows
 * never leak into WIOA / outcome reports.
 */
export const MEMBER_OR_DOGFOOD_WHERE = {
  profile: { role: { in: ['member', 'admin', 'super_admin'] } },
  email: { notIn: FIXTURE_EMAILS },
} satisfies Prisma.UserWhereInput;
