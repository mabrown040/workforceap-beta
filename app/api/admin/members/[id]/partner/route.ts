import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  request: NextRequest,
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

  let body: { partnerId: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { partnerId } = body;

  // Verify member exists
  const member = await prisma.user.findUnique({ where: { id: memberId, deletedAt: null } });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  if (partnerId === null) {
    // Remove partner assignment
    await prisma.partnerReferral.deleteMany({ where: { memberId } });
    return NextResponse.json({ ok: true, partnerId: null });
  }

  // Verify partner exists
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  // Upsert referral
  await prisma.partnerReferral.upsert({
    where: { partnerId_memberId: { partnerId, memberId } },
    update: {},
    create: { partnerId, memberId },
  });

  // Remove any other partner referral for this member (one partner at a time)
  await prisma.partnerReferral.deleteMany({
    where: { memberId, partnerId: { not: partnerId } },
  });

  return NextResponse.json({ ok: true, partnerId });
}
