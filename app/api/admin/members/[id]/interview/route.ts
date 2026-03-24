import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const bodySchema = z.object({
  action: z.enum(['mark_interviewed', 'clear_request']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(admin.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  if (parsed.data.action === 'mark_interviewed') {
    await prisma.user.update({
      where: { id: memberId },
      data: {
        interviewCompletedAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: memberId },
      data: {
        interviewRequestedAt: null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
