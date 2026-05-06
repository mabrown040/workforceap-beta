import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  listCourseraIdentityMappings,
  listRecentUnmatchedXapiEvents,
  upsertCourseraIdentityMapping,
} from '@/lib/xapi/mappings';
import { reprocessUnmatchedXapiEvents } from '@/lib/xapi/reprocess';

async function requireAdminUser() {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('unmatchedLimit') || '50');
  const unmatchedLimit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 50;

  try {
    const [mappings, unmatchedEvents] = await Promise.all([
      listCourseraIdentityMappings(),
      listRecentUnmatchedXapiEvents(unmatchedLimit),
    ]);

    return NextResponse.json({
      mappings,
      unmatchedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load Coursera mapping data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    userId?: string;
    courseraEmail?: string;
    actorIdentifier?: string;
    actorHomePage?: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.userId?.trim()) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (!body.courseraEmail?.trim() && !body.actorIdentifier?.trim()) {
    return NextResponse.json({ error: 'courseraEmail or actorIdentifier is required' }, { status: 400 });
  }

  try {
    const mapping = await upsertCourseraIdentityMapping({
      userId: body.userId.trim(),
      courseraEmail: body.courseraEmail,
      actorIdentifier: body.actorIdentifier,
      actorHomePage: body.actorHomePage,
      notes: body.notes,
      createdByUserId: user.id,
      source: 'manual-admin-api',
    });

    // Re-process unmatched xAPI events that might now match this mapping
    let reprocessResult;
    try {
      reprocessResult = await reprocessUnmatchedXapiEvents({
        userId: body.userId.trim(),
        courseraEmail: body.courseraEmail,
        actorIdentifier: body.actorIdentifier,
        limit: 50,
      });
    } catch (reprocessError) {
      console.error('[admin/coursera/mappings] reprocess failed:', reprocessError);
      reprocessResult = { processed: 0, matched: 0, errors: 0, details: [] };
    }

    return NextResponse.json({ 
      ok: true, 
      mapping,
      reprocessed: reprocessResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save Coursera mapping';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
