import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { completeMemberCourse } from '@/lib/member/courseCompletion';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

async function _POST(request: Request) {
  try {
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
      auditLog({ actorUserId: user.id, action: 'member.course.complete', targetType: 'CourseCompletion', targetId: user.id, metadata: { courseSlug } }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'CourseCompletion', id: user.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to mark course complete';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error('/member/courses/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
