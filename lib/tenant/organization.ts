import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { SEEDED_DEFAULT_ORG_ID } from '@/lib/tenant/defaultOrgConstants';

export const DEFAULT_ORG_SLUG = 'workforceap';

let cachedDefaultOrgId: string | null = null;

function isPrismaConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === 'P1001' || err.code === 'P1017';
  }
  return false;
}

/**
 * Dev/CI fallback when Postgres is unreachable (placeholder DB URL or fresh clone).
 * Never used on Vercel production — real org resolution is required there.
 */
export function resolveDevDefaultOrgIdFallback(): string | null {
  if (process.env.VERCEL_ENV === 'production') return null;
  const fromEnv = process.env.WAP_DEV_DEFAULT_ORG_ID?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.__PRISMA_PLACEHOLDER_DB === '1') {
    return SEEDED_DEFAULT_ORG_ID;
  }
  return null;
}

/** Single-tenant default org (migration seeds slug workforceap). */
export async function getDefaultOrganizationId(): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  try {
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
  } catch (err) {
    const fallback = resolveDevDefaultOrgIdFallback();
    if (fallback && isPrismaConnectionError(err)) {
      cachedDefaultOrgId = fallback;
      return fallback;
    }
    throw err;
  }
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

/**
 * Resolve the org for a member who is the SUBJECT of an action — used
 * by routes where an authenticated counselor/admin acts on a specific
 * member identified by `memberId` (in-office sessions, notes, messages,
 * nudges, etc.). The data we're scoping is the member's data, so the
 * member's tenant is the correct scope, NOT the actor's.
 *
 * Codex P2 catch on PR #1051: the original implementation used
 * `getActorOrganizationId(actor.id)` for these routes. That broke
 * super_admin cross-tenant access — `resolveActOnBehalf` allowed a
 * super_admin from Org A to act on an Org B member's behalf, but the
 * scoped Prisma lookup in the route then returned "Member not found"
 * because Org A's scope didn't include Org B's member.
 *
 * SECURITY NOTE: this function performs a CROSS-TENANT lookup (it has
 * to — the whole point is resolving across tenants). It is only safe
 * to call AFTER `resolveActOnBehalf` (or equivalent) has gated whether
 * the actor has authority over the subject member. Do not call this
 * helper without that gate; it would let any caller with an authenticated
 * session resolve any member's org.
 */
export async function getSubjectOrganizationId(memberId: string): Promise<string> {
  const row = await prisma.user.findUnique({
    where: { id: memberId },
    select: { organizationId: true },
  });
  if (!row) {
    throw new Error(`getSubjectOrganizationId: no user row for id=${memberId}`);
  }
  return row.organizationId;
}
