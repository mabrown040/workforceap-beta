import { randomUUID } from 'crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';

export const SUPER_ADMIN_EMPLOYER_COOKIE = 'wa_super_admin_employer_id';
export const SUPER_ADMIN_PARTNER_COOKIE = 'wa_super_admin_partner_id';
const SUPER_ADMIN_FALLBACK_PARTNER_SLUG = 'workforce-solutions-austin';
const SUPER_ADMIN_FALLBACK_PARTNER_NAME = 'Workforce Solutions Capital Area';
const SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL = 'employer-preview@example.com';
const SUPER_ADMIN_FALLBACK_EMPLOYER_NAME = 'WorkforceAP Example Employer';

export const getUserRoles = cache(async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur) => ur.role.name);
});

export const getProfileRole = cache(async function getProfileRole(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  return profile?.role ?? 'member';
});

export const isSuperAdmin = cache(async function isSuperAdmin(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  return profileRole === 'super_admin';
});

export async function isAdmin(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  if (profileRole === 'admin' || profileRole === 'super_admin') return true;
  const roles = await getUserRoles(userId);
  return roles.includes('admin');
}

export async function isStaff(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  if (profileRole === 'admin' || profileRole === 'super_admin') return true;
  const roles = await getUserRoles(userId);
  return roles.includes('admin') || roles.includes('case_manager');
}

export async function isCaseManager(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  if (profileRole === 'case_manager') return true;
  const roles = await getUserRoles(userId);
  return roles.includes('case_manager');
}

export async function requireAdmin(userId: string): Promise<void> {
  const ok = await isAdmin(userId);
  if (!ok) {
    throw new Error('Forbidden: admin access required');
  }
}

export const isCounselor = cache(async function isCounselor(userId: string): Promise<boolean> {
  const row = await prisma.counselor.findFirst({
    where: { userId, active: true },
    select: { id: true },
  });
  if (row) return true;
  return isSuperAdmin(userId);
});

export async function isPartner(userId: string): Promise<boolean> {
  const row = await prisma.partnerUser.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (row) return true;
  return isSuperAdmin(userId);
}

export type PartnerPortalContext = {
  partnerId: string;
  partner: { id: string; name: string; slug: string };
  /** User has a real `partner_users` row (not super-admin viewing first partner). */
  hasDirectPartnerLink: boolean;
};

export async function getPartnerForUser(
  userId: string,
  options?: { isSuperAdminHint?: boolean }
): Promise<PartnerPortalContext | null> {
  const row = await prisma.partnerUser.findUnique({
    where: { userId },
    include: { partner: { select: { id: true, name: true, slug: true, active: true } } },
  });
  if (row) {
    if (!row.partner.active) return null;
    const { active: _a, ...partner } = row.partner;
    return { partnerId: row.partnerId, partner, hasDirectPartnerLink: true };
  }
  const superUser = options?.isSuperAdminHint ?? (await isSuperAdmin(userId));
  if (superUser) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(SUPER_ADMIN_PARTNER_COOKIE)?.value;
    if (fromCookie) {
      const byCookie = await prisma.partner.findFirst({
        where: { id: fromCookie, active: true },
        select: { id: true, name: true, slug: true },
      });
      if (byCookie) return { partnerId: byCookie.id, partner: byCookie, hasDirectPartnerLink: false };
    }

    const fallbackPartner = await prisma.partner.findFirst({
      where: { slug: SUPER_ADMIN_FALLBACK_PARTNER_SLUG, active: true },
      select: { id: true, name: true, slug: true },
    });
    if (fallbackPartner) {
      return { partnerId: fallbackPartner.id, partner: fallbackPartner, hasDirectPartnerLink: false };
    }

    try {
      const ensuredFallbackPartner = await ensureSuperAdminFallbackPartner();
      return { partnerId: ensuredFallbackPartner.id, partner: ensuredFallbackPartner, hasDirectPartnerLink: false };
    } catch {
      // Missing org/seed or DB errors: fall through to any active partner.
    }

    const anyActivePartner = await prisma.partner.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    if (anyActivePartner) {
      return { partnerId: anyActivePartner.id, partner: anyActivePartner, hasDirectPartnerLink: false };
    }

    return null;
  }
  return null;
}

export async function getCounselorForUser(
  userId: string
): Promise<{ counselorId: string; partnerId: string | null; partnerName: string } | null> {
  const counselor = await prisma.counselor.findFirst({
    where: { userId, active: true },
    include: { partner: { select: { id: true, name: true } } },
  });
  if (!counselor) return null;
  return {
    counselorId: counselor.id,
    partnerId: counselor.partnerId,
    partnerName: counselor.partner?.name ?? 'WorkforceAP',
  };
}

export async function hasMultiplePortalRoles(userId: string): Promise<{
  isCounselor: boolean;
  isPartner: boolean;
  isEmployer: boolean;
  isAdmin: boolean;
}> {
  const [counselor, partner, employer, admin] = await Promise.all([
    isCounselor(userId),
    isPartner(userId),
    isEmployer(userId),
    isAdmin(userId),
  ]);
  
  return {
    isCounselor: counselor,
    isPartner: partner,
    isEmployer: employer,
    isAdmin: admin,
  };
}

/** Subgroup leader: user is leader_id of a subgroup or in subgroup_leaders */
export async function isSubgroupLeader(userId: string): Promise<boolean> {
  const [led, inLeaders] = await Promise.all([
    prisma.subgroup.findFirst({ where: { leaderId: userId }, select: { id: true } }),
    prisma.subgroupLeader.findFirst({ where: { userId }, select: { id: true } }),
  ]);
  return !!led || !!inLeaders;
}

/** Get subgroups this user can view (as leader or secondary leader) */
export async function getSubgroupsForUser(
  userId: string
): Promise<{ subgroupId: string; subgroup: { id: string; name: string; type: string } }[]> {
  const led = await prisma.subgroup.findMany({
    where: { leaderId: userId },
    select: { id: true, name: true, type: true },
  });
  const viaLeaders = await prisma.subgroupLeader.findMany({
    where: { userId },
    include: { subgroup: { select: { id: true, name: true, type: true } } },
  });
  const seen = new Set<string>();
  const result: { subgroupId: string; subgroup: { id: string; name: string; type: string } }[] = [];
  for (const s of led) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      result.push({ subgroupId: s.id, subgroup: s });
    }
  }
  for (const sl of viaLeaders) {
    if (!seen.has(sl.subgroup.id)) {
      seen.add(sl.subgroup.id);
      result.push({ subgroupId: sl.subgroup.id, subgroup: sl.subgroup });
    }
  }
  return result;
}

export async function requireSubgroupLeader(userId: string): Promise<{ subgroupId: string; subgroup: { id: string; name: string; type: string } }[]> {
  const subgroups = await getSubgroupsForUser(userId);
  if (subgroups.length === 0) {
    throw new Error('Forbidden: subgroup leader access required');
  }
  return subgroups;
}

/** Employer: user has an Employer record */
export async function isEmployer(userId: string): Promise<boolean> {
  const row = await prisma.employer.findUnique({
    where: { userId },
    select: { id: true },
  });
  return !!row;
}

async function ensureSuperAdminFallbackPartner(): Promise<{ id: string; name: string; slug: string }> {
  const organizationId = await getDefaultOrganizationId();
  return prisma.partner.upsert({
    where: { slug: SUPER_ADMIN_FALLBACK_PARTNER_SLUG },
    update: { active: true, referralCode: SUPER_ADMIN_FALLBACK_PARTNER_SLUG },
    create: {
      organizationId,
      name: SUPER_ADMIN_FALLBACK_PARTNER_NAME,
      slug: SUPER_ADMIN_FALLBACK_PARTNER_SLUG,
      referralCode: SUPER_ADMIN_FALLBACK_PARTNER_SLUG,
      active: true,
    },
    select: { id: true, name: true, slug: true },
  });
}

async function ensureSuperAdminFallbackEmployer(): Promise<{
  id: string;
  companyName: string;
  contactEmail: string;
  tier: string;
  logoUrl: string | null;
}> {
  const organizationId = await getDefaultOrganizationId();
  const user = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL },
    update: { fullName: 'Preview Employer Seed' },
    create: {
      id: randomUUID(),
      organizationId,
      email: SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL,
      fullName: 'Preview Employer Seed',
    },
    select: { id: true },
  });

  return prisma.employer.upsert({
    where: { userId: user.id },
    update: {
      companyName: SUPER_ADMIN_FALLBACK_EMPLOYER_NAME,
      contactEmail: SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL,
      status: 'active',
    },
    create: {
      organizationId,
      userId: user.id,
      companyName: SUPER_ADMIN_FALLBACK_EMPLOYER_NAME,
      contactName: 'WorkforceAP',
      contactEmail: SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL,
      tier: 'basic',
      status: 'active',
    },
    select: { id: true, companyName: true, contactEmail: true, tier: true, logoUrl: true },
  });
}

function mapEmployerRow(row: {
  id: string;
  companyName: string;
  contactEmail: string;
  tier: string;
  logoUrl: string | null;
}): {
  employerId: string;
  employer: { id: string; companyName: string; contactEmail: string; tier: string; logoUrl: string | null };
} {
  return {
    employerId: row.id,
    employer: {
      id: row.id,
      companyName: row.companyName,
      contactEmail: row.contactEmail,
      tier: row.tier,
      logoUrl: resolveSupabasePublicAssetUrl('employer-logos', row.logoUrl),
    },
  };
}

/**
 * Employer portal context. Super-admins can open a specific employer via Admin → Employers ("Open portal"),
 * stored in a cookie; otherwise they fall back only to their own employer row (if any).
 * Pass `isSuperAdminHint` when the caller already computed it to avoid duplicate `profile` reads.
 */
export async function getEmployerForUser(
  userId: string,
  options?: { isSuperAdminHint?: boolean }
): Promise<{
  employerId: string;
  employer: { id: string; companyName: string; contactEmail: string; tier: string; logoUrl: string | null };
} | null> {
  const superUser =
    options?.isSuperAdminHint !== undefined ? options.isSuperAdminHint : await isSuperAdmin(userId);

  if (superUser) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(SUPER_ADMIN_EMPLOYER_COOKIE)?.value;
    if (fromCookie) {
      const byCookie = await prisma.employer.findFirst({
        where: { id: fromCookie, status: 'active' },
        select: { id: true, companyName: true, contactEmail: true, tier: true, logoUrl: true },
      });
      if (byCookie) return mapEmployerRow(byCookie);
    }

    const fallbackEmployer = await prisma.employer.findFirst({
      where: { contactEmail: SUPER_ADMIN_FALLBACK_EMPLOYER_EMAIL, status: 'active' },
      select: { id: true, companyName: true, contactEmail: true, tier: true, logoUrl: true },
    });
    if (fallbackEmployer) return mapEmployerRow(fallbackEmployer);

    try {
      const ensuredFallbackEmployer = await ensureSuperAdminFallbackEmployer();
      return mapEmployerRow(ensuredFallbackEmployer);
    } catch {
      // Missing org/seed or DB errors: fall through to any active employer.
    }

    const anyActiveEmployer = await prisma.employer.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, companyName: true, contactEmail: true, tier: true, logoUrl: true },
    });
    if (anyActiveEmployer) return mapEmployerRow(anyActiveEmployer);
  }

  const row = await prisma.employer.findUnique({
    where: { userId },
    select: { id: true, companyName: true, contactEmail: true, status: true, tier: true, logoUrl: true },
  });
  if (row && row.status === 'active') {
    return mapEmployerRow(row);
  }

  if (superUser) {
    return null;
  }

  return null;
}

/**
 * Employer context for marketing nav / portal entry link.
 * Super-admins only get a company when impersonating via cookie — never the global DB fallback
 * (see getEmployerForUser), so the public nav does not send them to a random employer portal.
 */
export async function getEmployerAccountForNav(
  userId: string
): Promise<{ employerId: string; companyName: string } | null> {
  const superUser = await isSuperAdmin(userId);
  if (superUser) {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(SUPER_ADMIN_EMPLOYER_COOKIE)?.value;
    if (!fromCookie) return null;
    const byCookie = await prisma.employer.findFirst({
      where: { id: fromCookie, status: 'active' },
      select: { id: true, companyName: true },
    });
    return byCookie ? { employerId: byCookie.id, companyName: byCookie.companyName } : null;
  }

  const row = await prisma.employer.findUnique({
    where: { userId },
    select: { id: true, companyName: true, status: true },
  });
  if (row?.status === 'active') {
    return { employerId: row.id, companyName: row.companyName };
  }
  return null;
}

/** Check if user is an approved mentor */
export async function isMentor(userId: string): Promise<boolean> {
  const row = await prisma.mentor.findUnique({
    where: { userId },
    select: { id: true, isActive: true, approvedAt: true },
  });
  if (!row) return false;
  return row.isActive && !!row.approvedAt;
}
