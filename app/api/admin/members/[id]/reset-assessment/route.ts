import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, getProfileRole } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

export const POST = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);

    const result = await withTenantScope(orgId, (db) =>
      db.user.updateMany({
        where: { id },
        data: {
          assessmentCompleted: false,
          assessmentCompletedAt: null,
          assessmentScore: null,
          assessmentScorePct: null,
          assessmentAnswers: Prisma.JsonNull,
          programInterest: null,
        },
      }),
    );

    if (result.count === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const profileRole = await getProfileRole(user.id);
    auditLog({ actorUserId: user.id, action: 'admin_member_reset_assessment', targetType: 'User', targetId: id, metadata: { orgId } }).catch((err) => console.error('[audit] admin_member_reset_assessment:', err));
    await logAuditEvent({
      user: { id: user.id, role: profileRole ?? undefined },
      verb: 'reset_assessment',
      object: { type: 'User', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] reset-assessment:', err));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/members/[id]/reset-assessment POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
