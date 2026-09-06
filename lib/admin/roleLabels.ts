import type { USER_DIRECTORY_ROLES } from './directorySearch';

const ROLE_LABELS: Record<(typeof USER_DIRECTORY_ROLES)[number], string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super admin',
  case_manager: 'Case manager',
  counselor: 'Counselor',
  employer: 'Employer',
  partner: 'Partner',
};

/** Presentation only: keep stored role codes and submitted option values intact. */
export function directoryRoleLabel(role: string): string {
  const key = role.trim().toLowerCase().replace(/\s+/g, '_');
  return ROLE_LABELS[key as keyof typeof ROLE_LABELS]
    ?? role.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}
