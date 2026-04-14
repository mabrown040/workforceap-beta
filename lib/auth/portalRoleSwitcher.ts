import type { PortalRole } from '@/lib/nav/portalNav';
import {
  getCounselorForUser,
  getEmployerAccountForNav,
  getPartnerForUser,
  getUserRoles,
  isAdmin,
} from '@/lib/auth/roles';

export type PortalSwitcherRole = {
  role: PortalRole;
  roleLabel: string;
  homeHref: string;
};

const ROLE_ORDER: PortalRole[] = ['member', 'employer', 'partner', 'counselor', 'admin'];

const ROLE_META: Record<Extract<PortalRole, 'member' | 'employer' | 'partner' | 'counselor' | 'admin'>, Omit<PortalSwitcherRole, 'role'>> = {
  member: { roleLabel: 'Student', homeHref: '/dashboard' },
  employer: { roleLabel: 'Employer', homeHref: '/employer' },
  partner: { roleLabel: 'Partner', homeHref: '/partner' },
  counselor: { roleLabel: 'Counselor', homeHref: '/counselor' },
  admin: { roleLabel: 'Admin', homeHref: '/admin' },
};

export function buildPortalSwitcherRoles(input: {
  userRoleNames: string[];
  hasEmployer: boolean;
  hasPartner: boolean;
  hasCounselor: boolean;
  hasAdmin: boolean;
}): PortalSwitcherRole[] {
  const explicitRoles = new Set(input.userRoleNames);

  const available = new Set<PortalRole>();

  if (explicitRoles.has('member')) available.add('member');
  if (input.hasEmployer || explicitRoles.has('employer')) available.add('employer');
  if (input.hasPartner || explicitRoles.has('partner')) available.add('partner');
  if (input.hasCounselor) available.add('counselor');
  if (input.hasAdmin || explicitRoles.has('admin') || explicitRoles.has('super_admin') || explicitRoles.has('case_manager')) {
    available.add('admin');
  }

  return ROLE_ORDER.filter((role) => available.has(role)).map((role) => ({
    role,
    ...ROLE_META[role as keyof typeof ROLE_META],
  }));
}

export async function getPortalSwitcherRoles(userId: string): Promise<PortalSwitcherRole[]> {
  const [userRoleNames, employerNav, partnerCtx, counselorCtx, adminAccess] = await Promise.all([
    getUserRoles(userId),
    getEmployerAccountForNav(userId),
    getPartnerForUser(userId),
    getCounselorForUser(userId),
    isAdmin(userId),
  ]);

  return buildPortalSwitcherRoles({
    userRoleNames,
    hasEmployer: !!employerNav,
    hasPartner: !!partnerCtx,
    hasCounselor: !!counselorCtx,
    hasAdmin: adminAccess,
  });
}
