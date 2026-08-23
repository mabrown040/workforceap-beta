import 'server-only';

import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

/**
 * Admin SSR page tenant gate.
 *
 * Org admins must pass `isAdminInOrg` against their home org, then list/detail
 * queries run inside `withTenantScope` (plus FK helpers for models that inherit
 * tenant via `user` / `member` / `job`).
 *
 * Super-admin is platform-level and **intentionally cross-tenant** for
 * support / ops — the same product behavior as `isAdminInOrg` (bypass) and
 * existing surfaces like `/admin/invites`. Org-admin pages must not copy that
 * unscoped path.
 */
export type AdminPageTenant =
  | { ok: false }
  | { ok: true; orgId: string; superAdmin: boolean };

type ScopedFn<T> = Parameters<typeof withTenantScope>[1];
type AdminDb = Parameters<ScopedFn<unknown>>[0];

export async function resolveAdminPageTenant(userId: string): Promise<AdminPageTenant> {
  try {
    const orgId = await getActorOrganizationId(userId);
    if (!(await isAdminInOrg(userId, orgId))) return { ok: false };
    return { ok: true, orgId, superAdmin: await isSuperAdmin(userId) };
  } catch (err) {
    console.error('[admin-page-scope] failed to resolve actor org', err);
    return { ok: false };
  }
}

/**
 * Super-admins keep the unscoped Prisma client (cross-tenant support/ops).
 * Org admins get `withTenantScope` so User/Employer/Job/Partner/etc. cannot
 * leak another tenant.
 *
 * Models without `organizationId` (PlacementRecord, Application, MemberEvent,
 * Counselor, JobPostingApplication, …) still need an explicit FK filter
 * (`inheritUserOrg` / `inheritMemberOrg` / `inheritJobOrg`) when `superAdmin`
 * is false — the proxy is a no-op on those delegates.
 */
export async function withAdminPageScope<T>(
  scope: Extract<AdminPageTenant, { ok: true }>,
  fn: (db: AdminDb) => Promise<T>,
): Promise<T> {
  if (scope.superAdmin) {
    return fn(prisma as unknown as AdminDb);
  }
  return withTenantScope(scope.orgId, fn);
}

/** Spread onto where clauses that inherit tenant via `user`. */
export function inheritUserOrg(
  scope: Extract<AdminPageTenant, { ok: true }>,
): { user?: { organizationId: string } } {
  return scope.superAdmin ? {} : { user: { organizationId: scope.orgId } };
}

/** Spread onto where clauses that inherit tenant via `member`. */
export function inheritMemberOrg(
  scope: Extract<AdminPageTenant, { ok: true }>,
): { member?: { organizationId: string } } {
  return scope.superAdmin ? {} : { member: { organizationId: scope.orgId } };
}

/** Spread onto where clauses that inherit tenant via `job`. */
export function inheritJobOrg(
  scope: Extract<AdminPageTenant, { ok: true }>,
): { job?: { organizationId: string } } {
  return scope.superAdmin ? {} : { job: { organizationId: scope.orgId } };
}
