import { prisma } from '@/lib/db/prisma';

export const DEFAULT_ORG_SLUG = 'workforceap';

let cachedDefaultOrgId: string | null = null;

/** Single-tenant default org (migration seeds slug workforceap). */
export async function getDefaultOrganizationId(): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const row = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
    select: { id: true },
  });
  if (row) {
    cachedDefaultOrgId = row.id;
    return row.id;
  }
  throw new Error(
    `Default organization missing (slug=${DEFAULT_ORG_SLUG}). Run migrations and seed the default org — do not guess another tenant.`
  );
}

/**
 * Resolve the active org from the authenticated user.
 *
 * This is the correct scope source for ANY tenant-scoped action taken
 * by an authenticated user (admin or otherwise). Codex P1 catch on
 * PR #1047 — using `getDefaultOrganizationId()` in admin routes meant
 * a non-default-org admin would be scoped to the wrong tenant: they
 * could approve a default-org job by guessing its UUID, while their
 * own tenant's jobs would 404.
 *
 * Returns the user's `organizationId` from the `User` row.
 * Throws if the user has no row — indicates a stale auth session or
 * a deleted user; the route handler should map this to 403.
 */
export async function getActorOrganizationId(userId: string): Promise<string> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!row) {
    throw new Error(`getActorOrganizationId: no user row for id=${userId}`);
  }
  return row.organizationId;
}
