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

export async function isAdmin(userId: string): Promise<boolean> {
  const profileRole = await getProfileRole(userId);
  if (profileRole === 'admin') return true;
  const roles = await getUserRoles(userId);
  return roles.includes('admin') || roles.includes('case_manager');
}

export async function requireAdmin(userId: string): Promise<void> {
  const ok = await isAdmin(userId);
  if (!ok) {
    throw new Error('Forbidden: admin access required');
  }
}
