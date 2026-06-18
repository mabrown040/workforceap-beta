import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';
import { backfillUserIdForCourseraEmail } from '@/lib/coursera/csvImport.server';
import { replayUnresolvedXapiStatementsForIdentity } from '@/lib/coursera/replayPendingXapi';
import { getActorOrganizationId } from '@/lib/tenant/organization';
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
      const mapping = await upsertCourseraIdentityMapping({
        userId,
        courseraEmail,
        actorIdentifier,
        actorHomePage,
        createdByUserId: user.id,
        source: 'manual-admin-unmatched',
        notes: 'Mapped from Coursera-only learners list',
        expectedOrganizationId: organizationId,
      });
  
      const backfill = courseraEmail
        ? await backfillUserIdForCourseraEmail(courseraEmail, userId)
        : { courseRowsUpdated: 0, badgeRowsUpdated: 0 };
  
      // Immediately replay unresolved xAPI statements — including rows already marked processed
      // as unmatched/error before this mapping existed.
      const xapiReplay = await replayUnresolvedXapiStatementsForIdentity({ courseraEmail, actorIdentifier });
  
      return NextResponse.json({
        ok: true,
        mapping,
        backfill,
        xapiReplay,
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
