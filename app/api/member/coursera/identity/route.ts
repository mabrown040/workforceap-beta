import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const courseraEmail = normalizeEmail((body as Record<string, unknown>)?.courseraEmail);
  if (!courseraEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courseraEmail)) {
    return NextResponse.json({ error: 'Enter a valid Coursera email address.' }, { status: 400 });
  }

  try {
    const mapping = await upsertCourseraIdentityMapping({
      userId: user.id,
      courseraEmail,
      createdByUserId: user.id,
      source: 'member_self_link',
      notes: 'Saved by member from Training page',
    });

    return NextResponse.json({ ok: true, courseraEmail: mapping?.courseraEmail ?? courseraEmail });
  } catch (error) {
    console.error('[member/coursera/identity] failed to save Coursera email:', error);
    return NextResponse.json({ error: 'Unable to save your Coursera email right now.' }, { status: 500 });
  }
}
