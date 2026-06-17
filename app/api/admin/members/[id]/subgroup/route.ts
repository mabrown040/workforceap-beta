import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { z } from 'zod';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const postSchema = z.object({
  subgroupId: z.string().uuid(),
});async function _POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const subgroup = await prisma.$transaction((tx) => tx.subgroup.findFirst({
    where: { id: parsed.data.subgroupId, leader: { organizationId: orgId } },
    select: { id: true },
  }));
  if (!subgroup) {
    return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
  }

  const existing = await prisma.$transaction((tx) => tx.memberSubgroup.findUnique({
    where: { memberId_subgroupId: { memberId, subgroupId: parsed.data.subgroupId } },
  }));
  if (existing) {
    return NextResponse.json({ error: 'Member is already in this subgroup' }, { status: 400 });
  }

  await prisma.$transaction((tx) => tx.memberSubgroup.create({
    data: {
      memberId,
      subgroupId: parsed.data.subgroupId,
      assignedBy: user.id,
      assignmentType: 'manual_admin',
    },
  }));

  logAuditEvent({
    user: { id: user.id, role: 'admin' },
    verb: 'subgroup_member_added',
    object: { type: 'User', id: memberId },
    result: { success: true, extensions: { subgroupId: parsed.data.subgroupId } },
    request: auditRequestMeta(request),
    orgId,
  }).catch((err) => console.error('[audit] subgroup_member_added:', err));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/subgroup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const subgroupId = request.nextUrl.searchParams.get('subgroup');
  if (!subgroupId) {
    return NextResponse.json({ error: 'subgroup query param required' }, { status: 400 });
  }

  const member = await prisma.$transaction((tx) => tx.user.findFirst({ where: { id: memberId, organizationId: orgId }, select: { id: true, deletedAt: true } }));
  if (!member || member.deletedAt) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const subgroup = await prisma.$transaction((tx) => tx.subgroup.findFirst({
    where: { id: subgroupId, leader: { organizationId: orgId } },
    select: { id: true },
  }));
  if (!subgroup) {
    return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
  }

  const deleted = await prisma.$transaction((tx) => tx.memberSubgroup.deleteMany({
    where: {
      memberId,
      subgroupId,
      member: { organizationId: orgId },
      subgroup: { leader: { organizationId: orgId } },
    },
  }));

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Member not in this subgroup' }, { status: 404 });
  }

  logAuditEvent({
    user: { id: user.id, role: 'admin' },
    verb: 'subgroup_member_removed',
    object: { type: 'User', id: memberId },
    result: { success: true, extensions: { subgroupId } },
    request: auditRequestMeta(request),
    orgId,
  }).catch((err) => console.error('[audit] subgroup_member_removed:', err));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/subgroup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
