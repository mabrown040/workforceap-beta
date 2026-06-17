import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { awardPoints } from '@/lib/member/points';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

type Props = { params: Promise<{ id: string }> };

async function _POST(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [admin, counselor] = await Promise.all([isAdmin(user.id), isCounselor(user.id)]);
  if (!admin && !counselor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  // Tenant scope: verify the member belongs to the actor's org before
  // awarding points. Otherwise an Org A admin could write to an Org B
  // member's points ledger by guessing their UUID.
  const orgId = await getActorOrganizationId(user.id);
  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({ where: { id: memberId }, select: { id: true } }),
  );
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const points = typeof o.points === 'number' ? Math.round(o.points) : 0;
  const note = typeof o.note === 'string' ? o.note.trim().slice(0, 500) : '';

  if (points < 1 || points > 1000) {
    return NextResponse.json({ error: 'Points must be between 1 and 1000' }, { status: 400 });
  }

  const entityId = `bonus-${Date.now()}`;
  const result = await awardPoints(memberId, 'counselor_bonus', entityId, points, {
    note: note || undefined,
    awardedBy: user.id,
  });

  const actorRole = admin ? 'admin' : 'counselor';
  auditLog({
    actorUserId: user.id,
    action: 'award_points',
    targetType: 'User',
    targetId: memberId,
    metadata: { points, note: note || undefined, awardedBy: user.id, orgId },
  }).catch((err) => console.error('[audit] award_points:', err));
  logAuditEvent({
    user: { id: user.id, role: actorRole },
    verb: 'award_points',
    object: { type: 'User', id: memberId },
    result: { success: true, extensions: { points, note: note || undefined } },
    request: auditRequestMeta(request),
    orgId,
  }).catch((err) => console.error('[audit] award_points xapi:', err));

  return NextResponse.json({ ok: true, ...result });

  } catch (error) {
    console.error('/admin/members/[id]/award-points error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
