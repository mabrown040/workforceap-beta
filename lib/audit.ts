import { prisma } from '@/lib/db/prisma';
import type { PrismaClient } from '@prisma/client';
import { captureApiError } from '@/lib/observability/captureApiError';

type AuditDb = Pick<PrismaClient, 'user' | 'auditLog'>;

/** Sentry `api_route` tag for audit-trail write failures. */
export const AUDIT_WRITE_ROUTE = 'lib/audit.auditLog';

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
 *
 * `exists` reports what the lookup learned about the actor: `true` when the
 * user row was found, `false` when the id matched no user (a deleted account
 * or a non-user sentinel such as a cron job), `null` when the lookup itself
 * failed and nothing is known.
 */
export async function resolveActorSnapshot(
  actorUserId: string | null,
  db: AuditDb = prisma,
): Promise<{ email: string | null; role: string | null; exists: boolean | null }> {
  if (!actorUserId) return { email: null, role: null, exists: false };
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
    if (!user) return { email: null, role: null, exists: false };
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
    return { email: user.email ?? null, role, exists: true };
  } catch (err) {
    console.error('[audit] failed to resolve actor snapshot:', err);
    return { email: null, role: null, exists: null };
  }
}

/**
 * Write one `audit_logs` row.
 *
 * Two guarantees, both learned from production (2026-09-05, 142 rejected
 * writes a day for two months with nothing in Sentry):
 *
 * 1. An actor id that matches no `users` row — a cron sentinel, a deleted
 *    account — no longer trips the `audit_logs_actor_user_id_fkey` FK and
 *    silently loses the row. The row is written with a NULL actor and the
 *    original id preserved in `metadata.unresolvedActorId`, so the trail
 *    stays complete and the attribution is still recoverable.
 * 2. Any write that still fails is reported to Sentry (tagged
 *    `api_route: lib/audit.auditLog`) before it is rethrown. Callers that
 *    fire-and-forget with `.catch(() => {})` keep their non-blocking
 *    semantics, but the failure is no longer invisible.
 */
export async function auditLog(params: AuditParams, db: AuditDb = prisma): Promise<void> {
  let actorUserId = params.actorUserId;
  let actorEmail = params.actorEmailSnapshot ?? null;
  let actorRole = params.actorRoleSnapshot ?? null;
  let unresolvedActorId: string | null = null;
  if (
    actorUserId &&
    (params.actorEmailSnapshot === undefined || params.actorRoleSnapshot === undefined)
  ) {
    const snap = await resolveActorSnapshot(actorUserId, db);
    if (params.actorEmailSnapshot === undefined) actorEmail = snap.email;
    if (params.actorRoleSnapshot === undefined) actorRole = snap.role;
    if (snap.exists === false) {
      unresolvedActorId = actorUserId;
      actorUserId = null;
    }
  }

  const metadata = unresolvedActorId
    ? { ...(params.metadata ?? {}), unresolvedActorId }
    : params.metadata;

  try {
    await db.auditLog.create({
      data: {
        actorUserId,
        actorEmailSnapshot: actorEmail,
        actorRoleSnapshot: actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch (err) {
    captureApiError(err, {
      route: AUDIT_WRITE_ROUTE,
      extra: {
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        actorUserId: params.actorUserId,
      },
    });
    throw err;
  }
}
