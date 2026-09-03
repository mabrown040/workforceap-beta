/** Human-readable labels for invitation roles (emails, UI). */
export function invitationRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'partner':
      return 'Partner';
    case 'member':
      return 'Student';
    case 'counselor':
      return 'Counselor';
    default:
      return role;
  }
}

export function inviteAcceptLoginRedirect(role: string): string {
  // Counselors (incl. Community Ambassadors) land on profile setup first.
  if (role === 'counselor') return '/login?redirectTo=/counselor/profile';
  if (role === 'partner') return '/login?redirectTo=/partner';
  return '/login?redirectTo=/dashboard';
}
