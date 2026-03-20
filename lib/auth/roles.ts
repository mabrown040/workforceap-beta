import { prisma } from '@/lib/db/prisma';

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur) => ur.role.name);
}

export async function getProfileRole(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  return profile?.role ?? 'member';
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  return profileRole === 'super_admin';
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  if (profileRole === 'admin' || profileRole === 'super_admin') return true;
  const roles = await getUserRoles(userId);
  return roles.includes('admin') || roles.includes('case_manager');
}

export async function requireAdmin(userId: string): Promise<void> {
  const ok = await isAdmin(userId);
  if (!ok) {
    throw new Error('Forbidden: admin access required');
  }
}

export async function isPartner(userId: string): Promise<boolean> {
  const row = await prisma.partnerUser.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (row) return true;
  return isSuperAdmin(userId);
}

export async function getPartnerForUser(
  userId: string
): Promise<{ partnerId: string; partner: { id: string; name: string; slug: string } } | null> {
  const row = await prisma.partnerUser.findUnique({
    where: { userId },
    include: { partner: { select: { id: true, name: true, slug: true, active: true } } },
  });
  if (row) {
    if (!row.partner.active) return null;
    const { active: _a, ...partner } = row.partner;
    return { partnerId: row.partnerId, partner };
  }
  if (await isSuperAdmin(userId)) {
    const first = await prisma.partner.findFirst({
      where: { active: true },
      select: { id: true, name: true, slug: true },
    });
    if (first) return { partnerId: first.id, partner: first };
  }
  return null;
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
