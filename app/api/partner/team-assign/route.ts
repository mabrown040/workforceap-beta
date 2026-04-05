import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/** Partner portal users eligible as referral owners (same partner). */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await prisma.partnerUser.findMany({
      where: { partnerId: ctx.partnerId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      users: rows.map((r) => ({ id: r.userId, fullName: r.user.fullName, email: r.user.email })),
    });
  } catch (error) {
    console.error('[api/partner/team-assign] unexpected error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
