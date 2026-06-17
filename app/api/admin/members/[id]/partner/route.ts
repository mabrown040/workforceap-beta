import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { sendPartnerNewMemberAssignedEmail } from '@/lib/notifications/partner-notify';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

const patchSchema = z.object({
  /** Clear with null; empty string from forms coerces to null */
  partnerId: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable()
  ),
});export const PATCH = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  
    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const member = await prisma.$transaction((tx) => tx.user.findFirst({ where: { id: memberId, organizationId: orgId }, select: { id: true, deletedAt: true } }));
    if (!member || member.deletedAt) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
  
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }
  
    const { partnerId } = parsed.data;
  
    try {
      if (!partnerId) {
        await prisma.$transaction((tx) => tx.partnerReferral.deleteMany({ where: { memberId } }));
        void auditLog({ actorUserId: user.id, action: 'member_partner_remove', targetType: 'user', targetId: memberId, metadata: {} }).catch(() => {});
        return NextResponse.json({ ok: true });
      }
  
      const partner = await prisma.$transaction((tx) => tx.partner.findFirst({ where: { id: partnerId, active: true, organizationId: orgId } }));
      if (!partner) {
        return NextResponse.json({ error: 'Invalid or inactive partner' }, { status: 400 });
      }
  
      await prisma.$transaction(async (tx) => {
        await tx.partnerReferral.deleteMany({ where: { memberId } });
        await tx.partnerReferral.create({
          data: { partnerId, memberId },
        });
      });
  
      try {
        await sendPartnerNewMemberAssignedEmail(memberId, partnerId);
      } catch (notifyErr) {
        console.error('[admin] Partner assignment saved; notification failed:', notifyErr);
      }
  
      void auditLog({ actorUserId: user.id, action: 'member_partner_assign', targetType: 'user', targetId: memberId, metadata: { partnerId } }).catch(() => {});
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[admin] PATCH member partner:', e);
      const detail = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Could not update partner assignment.',
          detail,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/admin/members/[id]/partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
