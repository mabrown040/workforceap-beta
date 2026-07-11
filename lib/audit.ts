import { prisma } from '@/lib/db/prisma';
import type { PrismaClient } from '@prisma/client';

type AuditDb = Pick<PrismaClient, 'user' | 'auditLog'>;

type AuditParams = {
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Optional actor identity snapshot. If not provided, the helper looks
   * the actor up from the `users` + `user_roles` tables. Pass these
   * explicitly when the caller already has them in scope to save a
   * round-trip (e.g. inside route handlers that have `getUser()` data).
   */
  actorEmailSnapshot?: string | null;
  actorRoleSnapshot?: string | null;
};

/**
 * Resolve the actor's email + primary role name for the snapshot columns.
 *
 * PLAN-2026-Q3 §P4: `audit_logs.actor` FK has `onDelete: SetNull`, so
 * when a user is deleted the audit row would otherwise lose attribution.
 * We snapshot these fields at write time so the row stays self-contained
 * for WIOA / federal-funding audits (3-year retention window).
 *
 * Returns `{ email: null, role: null }` if the user can't be resolved —
 * the audit row is still written; logging never blocks the caller.
 */
export async function resolveActorSnapshot(
  actorUserId: string | null,
  db: AuditDb = prisma,
): Promise<{ email: string | null; role: string | null }> {
  if (!actorUserId) return { email: null, role: null };
  try {
    const user = await db.user.findUnique({
      where: { id: actorUserId },
      select: {
        email: true,
        userRoles: {
          select: { role: { select: { name: true } } },
          take: 5,
        },
      },
    });
    if (!user) return { email: null, role: null };
    const roleNames = user.userRoles.map((ur) => ur.role.name);
    // Stable, deterministic pick: prefer admin > counselor > partner > employer > member > other.
    const priority = ['admin', 'counselor', 'partner', 'employer', 'member'];
    let role: string | null = null;
    for (const p of priority) {
      if (roleNames.includes(p)) {
        role = p;
        break;
      }
    }
    if (!role && roleNames.length > 0) role = roleNames[0];
    return { email: user.email ?? null, role };
  } catch (err) {
    console.error('[audit] failed to resolve actor snapshot:', err);
    return { email: null, role: null };
  }
}

export async function auditLog(params: AuditParams, db: AuditDb = prisma): Promise<void> {
  let actorEmail = params.actorEmailSnapshot ?? null;
  let actorRole = params.actorRoleSnapshot ?? null;
  if (
    params.actorUserId &&
    (params.actorEmailSnapshot === undefined || params.actorRoleSnapshot === undefined)
  ) {
    const snap = await resolveActorSnapshot(params.actorUserId, db);
    if (params.actorEmailSnapshot === undefined) actorEmail = snap.email;
    if (params.actorRoleSnapshot === undefined) actorRole = snap.role;
  }

  await db.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actorEmailSnapshot: actorEmail,
      actorRoleSnapshot: actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ? (params.metadata as object) : undefined,
    },
  });
}
