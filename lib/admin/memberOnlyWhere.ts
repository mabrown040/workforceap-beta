import type { Prisma } from '@prisma/client';

/**
 * Prisma where-clause fragment that scopes user queries to actual member accounts only.
 * Excludes admin, super_admin, counselor, case_manager, employer, and partner profiles.
 * All signup paths create a profile row, so users without a profile row are also excluded
 * (they are seed/test accounts, not real members).
 * Also explicitly excludes known fixture/test accounts from production surfaces.
 */
export const MEMBER_ONLY_WHERE = {
  profile: { role: 'member' },
  email: {
    notIn: ['member.success@workforceap.org', 'mbrown@hsconglomerates.com'],
  },
} satisfies Prisma.UserWhereInput;
