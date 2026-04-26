import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export const ADMIN_USER_ROLES = ['member', 'admin', 'super_admin', 'case_manager'] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export async function ensureAppUser(
  tx: Tx,
  data: {
    authUserId: string;
    organizationId: string;
    email: string;
    fullName: string;
  }
) {
  const byId = await tx.user.findFirst({
    where: { id: data.authUserId },
    select: { id: true },
  });

  if (byId) {
    return tx.user.update({
      where: { id: data.authUserId },
      data: {
        organizationId: data.organizationId,
        email: data.email,
        fullName: data.fullName,
        deletedAt: null,
      },
      select: { id: true, fullName: true, email: true },
    });
  }

  const byEmail = await tx.user.findFirst({
    where: { email: data.email },
    select: { id: true },
  });

  if (byEmail) {
    throw new Error('ADMIN_USER_EMAIL_USER_ID_MISMATCH');
  }

  return tx.user.create({
    data: {
      id: data.authUserId,
      organizationId: data.organizationId,
      email: data.email,
      fullName: data.fullName,
    },
    select: { id: true, fullName: true, email: true },
  });
}

export async function ensureProfileRole(tx: Tx, userId: string, role: AdminUserRole) {
  const existing = await tx.profile.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return tx.profile.update({
      where: { id: existing.id },
      data: { role },
      select: { role: true },
    });
  }

  return tx.profile.create({
    data: {
      userId,
      role,
      consentTerms: false,
      consentCommunications: false,
    },
    select: { role: true },
  });
}

async function ensureRoleByName(tx: Tx, name: string) {
  const existing = await tx.role.findFirst({ where: { name }, select: { id: true, name: true } });
  if (existing) return existing;
  return tx.role.create({ data: { name }, select: { id: true, name: true } });
}

export async function syncManagedUserRoles(tx: Tx, userId: string, profileRole: AdminUserRole) {
  const managedRoleNames = ['admin', 'case_manager'] as const;
  const desiredRoleNames =
    profileRole === 'admin'
      ? ['admin']
      : profileRole === 'case_manager'
        ? ['case_manager']
        : [];

  const managedRoles = await Promise.all(managedRoleNames.map((name) => ensureRoleByName(tx, name)));

  for (const role of managedRoles) {
    if (desiredRoleNames.includes(role.name as (typeof managedRoleNames)[number])) {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: role.id } },
        create: { userId, roleId: role.id },
        update: {},
      });
      continue;
    }

    await tx.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });
  }
}
