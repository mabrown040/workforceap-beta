/** Profile.role or UserRole.name both grant platform super-admin. */
export function hasSuperAdminAccess(profileRole: string, userRoleNames: readonly string[]): boolean {
  return profileRole === 'super_admin' || userRoleNames.includes('super_admin');
}

export function hasAdminAccess(profileRole: string, userRoleNames: readonly string[]): boolean {
  return (
    profileRole === 'admin' ||
    profileRole === 'super_admin' ||
    userRoleNames.includes('admin') ||
    userRoleNames.includes('super_admin')
  );
}
