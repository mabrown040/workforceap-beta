import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  action: z.enum(['mark_interviewed', 'clear_request']),
});export const PATCH = withApiGuc(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const admin = await getUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(admin.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(admin.id);
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const member = await prisma.$transaction((tx) => tx.user.findFirst({
      where: { id: memberId, organizationId: orgId  },
      select: { id: true },
    }));
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (parsed.data.action === 'mark_interviewed') {
      await prisma.$transaction((tx) => tx.user.update({
        where: { id: memberId },
        data: {
          interviewCompletedAt: new Date(),
        },
      }));
    } else {
      await prisma.$transaction((tx) => tx.user.update({
        where: { id: memberId },
        data: {
          interviewRequestedAt: null,
        },
      }));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/members/[id]/interview PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
