import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

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
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true, deletedAt: true } });
  if (!member || member.deletedAt) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const subgroup = await prisma.subgroup.findUnique({ where: { id: parsed.data.subgroupId } });
  if (!subgroup) {
    return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
  }

  const existing = await prisma.memberSubgroup.findUnique({
    where: { memberId_subgroupId: { memberId, subgroupId: parsed.data.subgroupId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Member is already in this subgroup' }, { status: 400 });
  }

  await prisma.memberSubgroup.create({
    data: {
      memberId,
      subgroupId: parsed.data.subgroupId,
      assignedBy: user.id,
      assignmentType: 'manual_admin',
    },
  });

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
  const subgroupId = request.nextUrl.searchParams.get('subgroup');
  if (!subgroupId) {
    return NextResponse.json({ error: 'subgroup query param required' }, { status: 400 });
  }

  const deleted = await prisma.memberSubgroup.deleteMany({
    where: { memberId, subgroupId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Member not in this subgroup' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/subgroup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);

