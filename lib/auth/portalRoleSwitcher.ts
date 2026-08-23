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
  const inputs = await resolvePortalSwitcherInputs(userId, precomputed);

  if (inputs.superAdmin) {
    return ROLE_ORDER.map((role) => ({
      role,
      ...ROLE_META[role as keyof typeof ROLE_META],
    }));
  }

  return buildPortalSwitcherRoles(inputs);
}

/**
 * Fill only the switcher fields the caller did not already compute.
 * Layouts typically have `isAdmin` / `isSuperAdmin` / employer|partner|counselor
 * context; passing those skips the matching lookups instead of requiring the
 * full six-field snapshot `/api/auth/me` already builds.
 */
async function resolvePortalSwitcherInputs(
  userId: string,
  precomputed?: Partial<PortalSwitcherInputs>,
): Promise<PortalSwitcherInputs> {
  const superAdmin =
    precomputed?.superAdmin !== undefined ? precomputed.superAdmin : await isSuperAdmin(userId);
  const userRoleNames =
    precomputed?.userRoleNames !== undefined ? precomputed.userRoleNames : await getUserRoles(userId);

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

  const [hasEmployer, hasPartner, hasCounselor, hasAdmin] = await Promise.all([
    precomputed?.hasEmployer !== undefined
      ? precomputed.hasEmployer
      : getEmployerAccountForNav(userId).then((row) => !!row),
    precomputed?.hasPartner !== undefined
      ? precomputed.hasPartner
      : getPartnerForUser(userId).then((row) => !!row),
    precomputed?.hasCounselor !== undefined
      ? precomputed.hasCounselor
      : getCounselorForUser(userId).then((row) => !!row),
    precomputed?.hasAdmin !== undefined ? precomputed.hasAdmin : isAdmin(userId),
  ]);

  return {
    superAdmin,
    userRoleNames,
    hasEmployer,
    hasPartner,
    hasCounselor,
    hasAdmin,
  };
}
