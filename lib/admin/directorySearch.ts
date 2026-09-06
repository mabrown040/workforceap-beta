import type { Prisma } from '@prisma/client';

/** Share normalized name/email matching between full directories and quick search. */
export function normalizeDirectorySearch(value: string): string {
  return value.replace(/\0/g, '').trim().replace(/\s+/g, ' ').slice(0, 200).trim();
}

export function buildDirectorySearchWhere(query: string): Prisma.UserWhereInput {
  const normalized = normalizeDirectorySearch(query);
  if (!normalized) return {};
  return {
    AND: normalized.split(' ').map((token) => ({
      OR: [
        { fullName: { contains: token, mode: 'insensitive' } },
        { email: { contains: token, mode: 'insensitive' } },
      ],
    })),
  };
}

export const STAFF_DIRECTORY_ROLES = ['admin', 'super_admin', 'case_manager', 'counselor'] as const;
export const USER_DIRECTORY_ROLES = [...STAFF_DIRECTORY_ROLES, 'member', 'employer', 'partner'] as const;

export function buildUserDirectoryWhere(options: {
  searchQuery: string;
  roleFilter: string;
  staffOnly: boolean;
}): Prisma.UserWhereInput {
  const allowedRoles: readonly string[] = options.staffOnly ? STAFF_DIRECTORY_ROLES : USER_DIRECTORY_ROLES;
  const role = allowedRoles.includes(options.roleFilter) ? options.roleFilter : '';
  const roleWhere: Prisma.UserWhereInput = role === 'member'
    // The existing full manager displays accounts without a profile as members.
    ? { OR: [{ profile: { role: 'member' } }, { profile: { is: null } }] }
    : role
      ? { profile: { role } }
      : options.staffOnly
        ? { profile: { role: { in: [...STAFF_DIRECTORY_ROLES] } } }
        : {};
  return {
    deletedAt: null,
    AND: [buildDirectorySearchWhere(options.searchQuery), roleWhere],
  };
}
