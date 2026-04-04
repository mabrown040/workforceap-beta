import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
const patchSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  adminNote: z.string().max(4000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.programChangeRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, enrolledProgram: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 });
  }

  const nextStatus = parsed.data.status;

  await prisma.$transaction(async (tx) => {
    await tx.programChangeRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        adminNote: parsed.data.adminNote ?? null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    if (nextStatus === 'APPROVED') {
      await tx.user.update({
        where: { id: existing.userId },
        data: { enrolledProgram: existing.requestedProgramSlug },
      });
    }
  });

  const updated = await prisma.programChangeRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true, enrolledProgram: true } },
      reviewedBy: { select: { id: true, email: true, fullName: true } },
    },
  });

  return NextResponse.json({ request: updated });
}
