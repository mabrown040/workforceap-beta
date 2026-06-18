import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import { syncUserFromB4B } from '@/lib/coursera/syncUserFromB4B';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

/**
 * POST /api/admin/coursera/sync-user-from-b4b
 *
 * Body: { email: string }
 *
 * Pulls authoritative enrollment data for a single learner from Coursera For
 * Business and seeds matching `CourseEnrollment` rows in WAP, then replays any
 * unprocessed xAPI statements for that learner. This closes the gap where
 * Coursera knows about the learner but WAP has no enrollment row to credit
 * progress against (so xAPI events bounce with `No program enrolled`).
 *
 * Auth: super_admin OR admin in the actor's org.
 *
 * The actual B4B pull + write logic lives in `lib/coursera/syncUserFromB4B.ts`
 * and is shared with the self auto-sync route at
 * `/api/member/coursera/auto-sync` so a member's first dashboard visit can
 * seed their enrollment without an admin having to click anything.
 */

const bodySchema = z.object({
  email: z.string().email().max(320),
});

function normEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

async function _POST(request: NextRequest) {
  try {
    const actor = await getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    let orgId: string;
    try {
      orgId = await getActorOrganizationId(actor.id);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/sync-user-from-b4b' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const superAdmin = await isSuperAdmin(actor.id);
    if (!superAdmin && !(await isAdminInOrg(actor.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
        { status: 400 },
      );
    }
    const email = normEmail(parsed.data.email);
  
    // Find the WAP user (tenant-scoped) — same gate as before; we never
    // auto-provision a WAP account here.
    const wapUser = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: {
          deletedAt: null,
          email: { equals: email, mode: 'insensitive' },
        },
        select: {
          id: true,
          email: true,
          organizationId: true,
          enrolledProgram: true,
        },
      }),
    );
  
    if (!wapUser) {
      return NextResponse.json(
        { error: 'user does not exist in WAP — use Add to WAP first' },
        { status: 404 },
      );
    }
  
    try {
      const result = await syncUserFromB4B({
        email,
        wapUserId: wapUser.id,
        orgId,
        enrolledByAdmin: actor.id,
        existingEnrolledProgram: wapUser.enrolledProgram,
      });
      void auditLog({ actorUserId: actor.id, action: 'admin_coursera_sync_b4b', targetType: 'User', targetId: wapUser.id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: actor.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSyncB4B', id: wapUser.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json(result);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/sync-user-from-b4b' });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Coursera sync failed',
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/sync-user-from-b4b:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
