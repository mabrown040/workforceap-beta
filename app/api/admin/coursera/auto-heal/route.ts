import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { autoHealUnmatchedXapiEvents } from '@/lib/xapi/reprocess';
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

async function _POST() {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const result = await autoHealUnmatchedXapiEvents(200);
      void auditLog({ actorUserId: user.id, action: 'admin_coursera_auto_heal', targetType: 'User', targetId: user.id, metadata: {} }).catch(() => {});
      logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'CourseraAutoHeal', id: user.id }, result: { success: true } }).catch(() => {});
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-heal failed';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/coursera/auto-heal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _GET() {
  return NextResponse.json(
    { error: 'Use POST to trigger auto-heal' },
    { status: 405 },
  );
}

export const POST = withApiGuc(_POST);
export const GET = withApiGuc(_GET);
