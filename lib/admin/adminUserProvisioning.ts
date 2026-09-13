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
  const normalizedEmail = data.email.toLowerCase();
  const byId = await tx.user.findFirst({
    where: { id: data.authUserId },
    select: { id: true, organizationId: true, email: true, deletedAt: true },
  });

  if (byId) {
    // A concurrent tenant may have won the global-email/Auth race. Never
    // rehome or rewrite that application identity. This transaction-local
    // guard runs before every User/Profile/UserRole mutation.
    if (
      byId.organizationId !== data.organizationId ||
      byId.email.toLowerCase() !== normalizedEmail ||
      byId.deletedAt !== null
    ) {
      throw new Error('ADMIN_USER_AUTH_IDENTITY_CONFLICT');
    }
    const updated = await tx.user.updateMany({
      where: {
        id: data.authUserId,
        organizationId: data.organizationId,
        email: normalizedEmail,
        deletedAt: null,
      },
      data: { fullName: data.fullName },
    });
    if (updated.count !== 1) {
      throw new Error('ADMIN_USER_AUTH_IDENTITY_CONFLICT');
    }
    return { id: byId.id, fullName: data.fullName, email: byId.email };
  }

  const byEmail = await tx.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, organizationId: true },
  });

  if (byEmail) {
    throw new Error('ADMIN_USER_EMAIL_USER_ID_MISMATCH');
  }

  return tx.user.create({
    data: {
      id: data.authUserId,
      organizationId: data.organizationId,
      email: normalizedEmail,
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
