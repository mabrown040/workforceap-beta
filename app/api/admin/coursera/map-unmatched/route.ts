import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';
import { backfillUserIdForCourseraEmail } from '@/lib/coursera/csvImport.server';

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
export async function POST(request: Request) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId?: string; courseraEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const courseraEmail = body.courseraEmail?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (!courseraEmail) {
    return NextResponse.json({ error: 'courseraEmail is required' }, { status: 400 });
  }

  try {
    const mapping = await upsertCourseraIdentityMapping({
      userId,
      courseraEmail,
      createdByUserId: user.id,
      source: 'manual-admin-unmatched',
      notes: 'Mapped from Coursera-only learners list',
    });

    const backfill = await backfillUserIdForCourseraEmail(courseraEmail, userId);

    return NextResponse.json({
      ok: true,
      mapping,
      backfill,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to map learner';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
