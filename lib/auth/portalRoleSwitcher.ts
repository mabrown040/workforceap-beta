import type { PortalRole } from '@/lib/nav/portalNav';
import {
  getCounselorForUser,
  getEmployerAccountForNav,
  getPartnerForUser,
  getUserRoles,
  isAdmin,
  isSuperAdmin,
} from '@/lib/auth/roles';

export type PortalSwitcherRole = {
  role: PortalRole;
  roleLabel: string;
  homeHref: string;
};

const ROLE_ORDER: PortalRole[] = ['member', 'employer', 'partner', 'counselor', 'admin'];

const ROLE_META: Record<Extract<PortalRole, 'member' | 'employer' | 'partner' | 'counselor' | 'admin'>, Omit<PortalSwitcherRole, 'role'>> = {
  member: { roleLabel: 'Member', homeHref: '/dashboard' },
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

  const hasNonMemberPortalAccess =
    input.hasEmployer ||
    input.hasPartner ||
    input.hasCounselor ||
    input.hasAdmin ||
    explicitRoles.has('employer') ||
    explicitRoles.has('partner') ||
    explicitRoles.has('admin') ||
    explicitRoles.has('super_admin') ||
    explicitRoles.has('case_manager');

  // Do not invent member access for employer/admin/counselor-only users.
  // Member remains available when explicitly granted, or as the safe default for users
  // with no other portal role yet.
  if (explicitRoles.has('member') || !hasNonMemberPortalAccess) available.add('member');
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

export type PortalSwitcherInputs = {
  superAdmin: boolean;
  userRoleNames: string[];
  hasEmployer: boolean;
  hasPartner: boolean;
  hasCounselor: boolean;
  hasAdmin: boolean;
};

/**
 * Resolve the portal-switcher roles for a user.
 *
 * Pass `precomputed` when the caller has already fetched these primitives
 * (e.g. `/api/auth/me` computes role / partner / counselor / employer /
 * super-admin for its own response). Supplying them skips the internal
 * `Promise.all` of six DB lookups — several of which would otherwise
 * duplicate queries the caller just ran — which keeps this frequently
 * polled path from amplifying connection-pool pressure.
 */
export async function getPortalSwitcherRoles(
  userId: string,
  precomputed?: Partial<PortalSwitcherInputs>
): Promise<PortalSwitcherRole[]> {
  const inputs: PortalSwitcherInputs =
    precomputed &&
    precomputed.superAdmin !== undefined &&
    precomputed.userRoleNames !== undefined &&
    precomputed.hasEmployer !== undefined &&
    precomputed.hasPartner !== undefined &&
    precomputed.hasCounselor !== undefined &&
    precomputed.hasAdmin !== undefined
      ? (precomputed as PortalSwitcherInputs)
      : await fetchPortalSwitcherInputs(userId);

  if (inputs.superAdmin) {
    return ROLE_ORDER.map((role) => ({
      role,
      ...ROLE_META[role as keyof typeof ROLE_META],
    }));
  }

  return buildPortalSwitcherRoles(inputs);
}

async function fetchPortalSwitcherInputs(userId: string): Promise<PortalSwitcherInputs> {
  const [superAdmin, userRoleNames] = await Promise.all([
    isSuperAdmin(userId),
    getUserRoles(userId),
  ]);

  if (superAdmin) {
    return {
      superAdmin: true,
      userRoleNames,
      hasEmployer: false,
      hasPartner: false,
      hasCounselor: false,
      hasAdmin: true,
    };
  }

  const [employerNav, partnerCtx, counselorCtx, adminAccess] = await Promise.all([
    getEmployerAccountForNav(userId),
    getPartnerForUser(userId),
    getCounselorForUser(userId),
    isAdmin(userId),
  ]);

  return {
    superAdmin,
    userRoleNames,
    hasEmployer: !!employerNav,
    hasPartner: !!partnerCtx,
    hasCounselor: !!counselorCtx,
    hasAdmin: adminAccess,
  };
}
