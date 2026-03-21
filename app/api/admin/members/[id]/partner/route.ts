import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerNewMemberAssignedEmail } from '@/lib/notifications/partner-notify';
import { z } from 'zod';

const patchSchema = z.object({
  /** Clear with null; empty string from forms coerces to null */
  partnerId: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().uuid().nullable()
  ),
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

  try {
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

    try {
      await sendPartnerNewMemberAssignedEmail(memberId, partnerId);
    } catch (notifyErr) {
      console.error('[admin] Partner assignment saved; notification failed:', notifyErr);
    }

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
}
