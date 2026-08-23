/**
 * Pure FK-scope helpers for admin SSR pages. Kept free of `server-only`
 * so `node --test` can cover the super-admin vs org-admin split.
 *
 * Super-admin is intentionally unscoped (platform ops). Org admins must
 * inherit tenant via the parent relation.
 */

export type AdminPageTenantOk = { ok: true; orgId: string; superAdmin: boolean };

/** Spread onto where clauses that inherit tenant via `user`. */
export function inheritUserOrg(
  scope: AdminPageTenantOk,
): { user?: { organizationId: string } } {
  return scope.superAdmin ? {} : { user: { organizationId: scope.orgId } };
}

/** Spread onto where clauses that inherit tenant via `member`. */
export function inheritMemberOrg(
  scope: AdminPageTenantOk,
): { member?: { organizationId: string } } {
  return scope.superAdmin ? {} : { member: { organizationId: scope.orgId } };
}

/** Spread onto where clauses that inherit tenant via `job`. */
export function inheritJobOrg(
  scope: AdminPageTenantOk,
): { job?: { organizationId: string } } {
  return scope.superAdmin ? {} : { job: { organizationId: scope.orgId } };
}
