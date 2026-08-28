/**
 * Shared authorization predicate for an admin acting on a member whose
 * organization was resolved independently.
 *
 * Org admins may only act inside their own organization. Platform
 * super-admins intentionally retain cross-tenant support access, but a
 * missing subject organization is never authorized for either role.
 */
export function canAdminActInSubjectOrganization(args: {
  actorOrgId: string | null;
  subjectOrgId: string | null;
  superAdmin: boolean;
}): boolean {
  if (!args.subjectOrgId) return false;
  return args.superAdmin || args.actorOrgId === args.subjectOrgId;
}
