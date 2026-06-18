import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { backfillAllOrphanedCourseraProgress } from '@/lib/coursera/csvImport.server';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) return null;
  return user;
}

/**
 * POST /api/admin/coursera/backfill-orphans
 *
 * One-time backfill: for every saved Coursera identity mapping, re-link any
 * orphaned coursera_course_progress / coursera_badge_progress rows where
 * user_id IS NULL and the external_email matches the mapping.
 *
 * Idempotent — safe to re-run. Does not send completion emails (the promotion
 * path only upserts into course_progress; email triggers live in
 * completeMemberCourse which is not called here).
 */
export const POST = withApiGuc(async () => {
  try {
    const admin = await requireAdminUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await backfillAllOrphanedCourseraProgress();

    void auditLog({ actorUserId: admin.id, action: 'admin_coursera_backfill_orphans', targetType: 'User', targetId: admin.id, metadata: {} }).catch(() => {});
    logAuditEvent({ user: { id: admin.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraBackfillOrphans', id: admin.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({
      ok: true,
      mappingsProcessed: result.mappingsProcessed,
      totalCourseRowsUpdated: result.totalCourseRowsUpdated,
      totalBadgeRowsUpdated: result.totalBadgeRowsUpdated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('/admin/coursera/backfill-orphans error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});
