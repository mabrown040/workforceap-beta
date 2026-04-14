import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { completeMemberCourse } from '@/lib/member/courseCompletion';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const courseSlug = typeof o.courseSlug === 'string' ? o.courseSlug.trim() : '';

  if (!courseSlug) {
    return NextResponse.json({ error: 'courseSlug is required' }, { status: 400 });
  }

  try {
    const result = await completeMemberCourse({
      userId: user.id,
      courseSlug,
      source: 'member',
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to mark course complete';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
