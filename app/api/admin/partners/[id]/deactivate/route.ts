import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const bodySchema = z.object({
  reassignToPartnerId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: partnerId } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { _count: { select: { referrals: true } } },
  });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  if (!partner.active) {
    return NextResponse.json({ error: 'Partner is already inactive' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  const reassignToPartnerId = parsed.success ? parsed.data.reassignToPartnerId : undefined;

  if (reassignToPartnerId) {
    const target = await prisma.partner.findFirst({ where: { id: reassignToPartnerId, active: true } });
    if (!target) {
      return NextResponse.json({ error: 'Invalid or inactive target partner for reassignment' }, { status: 400 });
    }
    if (reassignToPartnerId === partnerId) {
      return NextResponse.json({ error: 'Cannot reassign to the same partner' }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (reassignToPartnerId && partner._count.referrals > 0) {
      const referrals = await tx.partnerReferral.findMany({
        where: { partnerId },
        select: { memberId: true },
      });
      for (const r of referrals) {
        const existing = await tx.partnerReferral.findUnique({
          where: {
            partnerId_memberId: { partnerId: reassignToPartnerId, memberId: r.memberId },
          },
        });
        if (!existing) {
          await tx.partnerReferral.create({
            data: { partnerId: reassignToPartnerId, memberId: r.memberId },
          });
        }
        await tx.partnerReferral.deleteMany({
          where: { partnerId, memberId: r.memberId },
        });
      }
    }
    await tx.partner.update({
      where: { id: partnerId },
      data: { active: false },
    });
  });

  return NextResponse.json({ ok: true, active: false });
}
