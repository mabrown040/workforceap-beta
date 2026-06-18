import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { runMentorStatusUpdate } from '@/lib/admin/mentorStatusUpdate';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
export const PATCH = withApiGuc(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as 'approve' | 'deactivate' | 'activate';

    const result = await runMentorStatusUpdate(id, action);
    if (!result.ok) {
      if (result.error === 'Not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const mentor = await prisma.$transaction((tx) => tx.mentor.findUnique({ where: { id } }));
    void auditLog({ actorUserId: user.id, action: 'admin_mentor_status_update', targetType: 'mentor', targetId: id, metadata: { action } }).catch(() => {});
    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'updated',
      object: { type: 'Mentor', id },
      result: { success: true, extensions: { action } },
      request: auditRequestMeta(req as Request),
    }).catch(() => {});
    return NextResponse.json({ mentor });
  } catch (error) {
    console.error('[admin/mentors/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
