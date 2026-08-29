import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { mapCourseraIdentityAndProgress } from '@/lib/coursera/mapIdentityAndProgress.server';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Inline "Map to WAP user" action used from the Coursera-only learners list.
 *
 * Combines two side effects in one round-trip:
 *   1. Upsert a coursera_identity_mappings row binding userId ↔ courseraEmail
 *      so the next ingest run, xAPI event, etc. resolves automatically.
 *   2. Backfill `user_id` on existing coursera_course_progress and
 *      coursera_badge_progress rows for that email so the new mapping is
 *      reflected immediately on the admin page without needing a re-import.
 */
async function _POST(request: Request) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = await getActorOrganizationId(user.id);

    let body: { userId?: string; courseraEmail?: string; actorIdentifier?: string; actorHomePage?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const userId = body.userId?.trim();
    const courseraEmail = body.courseraEmail?.trim();
    const actorIdentifier = body.actorIdentifier?.trim();
    const actorHomePage = body.actorHomePage?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!courseraEmail && !actorIdentifier) {
      return NextResponse.json({ error: 'courseraEmail or actorIdentifier is required' }, { status: 400 });
    }

    try {
      const result = await mapCourseraIdentityAndProgress({
        userId,
        organizationId,
        courseraEmail,
        actorIdentifier,
        actorHomePage,
        createdByUserId: user.id,
        source: 'manual-admin-unmatched',
        notes: 'Mapped from Coursera-only learners list',
      });

      // Deliberately do not replay historical xAPI from this identity-binding
      // action. The existing replay pipeline can emit completion emails,
      // points, and graduation side effects for enrolled learners. Mapping is
      // an administrative data-repair operation: it binds lossless raw rows,
      // promotes canonical progress through the no-downgrade merge ladder,
      // and refreshes rollups only. Future live xAPI resolves via the mapping.

      void auditLog({ actorUserId: user.id, action: 'admin_coursera_learner_mapped', targetType: 'User', targetId: userId, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraIdentityMapping', id: userId }, result: { success: true } }).catch(() => {});
      return NextResponse.json({
        ok: true,
        mapping: result.mapping,
        backfill: result.backfill,
        xapiReplay: null,
        xapiReplayDeferred: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to map learner';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error('/admin/coursera/map-unmatched:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
