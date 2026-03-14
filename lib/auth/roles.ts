import { prisma } from '@/lib/db/prisma';

export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur) => ur.role.name);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes('admin') || roles.includes('case_manager');
}

export async function requireAdmin(userId: string): Promise<void> {
  const ok = await isAdmin(userId);
  if (!ok) {
    throw new Error('Forbidden: admin access required');
  }
}
