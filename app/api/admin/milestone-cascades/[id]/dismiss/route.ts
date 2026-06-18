import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Dismiss a cascade without sending. Reason is optional but encouraged —
 * dismissal text is the highest-signal feedback we get on prompt quality.
 *
 * Admin-only AND tenant-scoped. See sibling approve/route.ts for the same
 * rationale.
 */

async function resolveCascadeUserFilter(staffUserId: string): Promise<object> {
  if (await isSuperAdmin(staffUserId)) return {};
  try {
    const orgId = await getActorOrganizationId(staffUserId);
    return { user: { organizationId: orgId } };
  } catch {
    return { id: '__deny__' };
  }
}

const bodySchema = z.object({
  reason: z.string().max(1000).optional(),
});

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Tenant scope (mirrors approve route): cross-tenant cascade ids
    // resolve to 404, preventing tenant admins from dismissing other
    // tenants' cascades by guessing UUIDs.
    const cascade = await prisma.milestoneCascade.findFirst({
      where: { id, ...(await resolveCascadeUserFilter(user.id)) },
      select: { id: true, userId: true, status: true },
    });
    if (!cascade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (cascade.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: `Cascade is in status "${cascade.status}", not awaiting_approval` },
        { status: 409 },
      );
    }

    const reason = parsed.data.reason?.trim() || null;

    const updateResult = await prisma.milestoneCascade.updateMany({
      where: { id, status: 'awaiting_approval' },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedReason: reason,
      },
    });
    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Cascade was no longer awaiting_approval (lost race)' },
        { status: 409 },
      );
    }

    await auditLog({
      actorUserId: user.id,
      action: 'milestone_cascade.dismiss',
      targetType: 'MilestoneCascade',
      targetId: id,
      metadata: { targetUserId: cascade.userId, reason },
    }).catch((err) => console.error('[milestone-cascade] auditLog failed:', err));
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'dismissed', object: { type: 'MilestoneCascade', id }, result: { success: true, extensions: { targetUserId: cascade.userId, reason: reason ?? null } } }).catch(() => {});

    trackEvent({
      userId: cascade.userId,
      eventName: 'milestone_cascade_dismissed',
      entityType: 'MilestoneCascade',
      entityId: id,
      metadata: { dismissedBy: user.id, reason },
    }).catch(() => {});

    return NextResponse.json({ ok: true, cascadeId: id });
  } catch (err) {
    console.error('[milestone-cascade dismiss] unhandled:', err);
    return NextResponse.json(
      { error: 'Dismiss failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
export const POST = withApiGuc(_POST);
