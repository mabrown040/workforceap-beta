import { NextResponse } from 'next/server';

import { syncCourseraB4BEnrollmentReports } from '@/lib/coursera/b4bSync';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { captureApiError } from '@/lib/observability/captureApiError';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}

/**
 * POST /api/admin/coursera/sync-b4b
 *
 * One-time admin trigger: pulls all enrollment reports from Coursera B4B API
 * and writes/upserts them into CourseProgress + MemberProgramProgress.
 *
 * Auth: requires an active admin session (same as /admin/coursera).
 */
async function _POST() {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const result = await syncCourseraB4BEnrollmentReports();
      void auditLog({ actorUserId: user.id, action: 'admin_coursera_sync_b4b_triggered', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraSyncB4BTrigger', id: user.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json({ ok: true, result });
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/sync-b4b' });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Sync failed' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('/admin/coursera/sync-b4b:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
