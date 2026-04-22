import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  listCourseraIdentityMappings,
  listRecentUnmatchedXapiEvents,
  upsertCourseraIdentityMapping,
} from '@/lib/xapi/mappings';

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

  const [mappings, unmatchedEvents] = await Promise.all([
    listCourseraIdentityMappings(),
    listRecentUnmatchedXapiEvents(unmatchedLimit),
  ]);

  return NextResponse.json({
    mappings,
    unmatchedEvents,
  });
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

    return NextResponse.json({ ok: true, mapping });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save Coursera mapping';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
