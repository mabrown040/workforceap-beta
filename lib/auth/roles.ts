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
    include: { partner: { select: { id: true, name: true, slug: true } } },
  });
  if (row) return { partnerId: row.partnerId, partner: row.partner };
  if (await isSuperAdmin(userId)) {
    const first = await prisma.partner.findFirst({
      where: { active: true },
      select: { id: true, name: true, slug: true },
    });
    if (first) return { partnerId: first.id, partner: first };
  }
  return null;
}
