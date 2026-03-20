import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  partnerId: z.string().uuid().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (!partnerId) {
    await prisma.partnerReferral.deleteMany({ where: { memberId } });
    return NextResponse.json({ ok: true });
  }

  const partner = await prisma.partner.findFirst({ where: { id: partnerId, active: true } });
  if (!partner) {
    return NextResponse.json({ error: 'Invalid or inactive partner' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.partnerReferral.deleteMany({ where: { memberId } });
    await tx.partnerReferral.create({
      data: { partnerId, memberId },
    });
  });

  return NextResponse.json({ ok: true });
}
