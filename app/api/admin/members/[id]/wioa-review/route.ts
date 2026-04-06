import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { WIOA_REVIEW_STATUSES } from '@/lib/wioa/wioaReview';

const bodySchema = z.object({
  status: z.enum(WIOA_REVIEW_STATUSES),
  notes: z.string().max(8000).optional().nullable(),
});

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  const actor = await getUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { id: true, wioaQualificationJson: true },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.wioaQualificationJson) {
    return NextResponse.json({ error: 'Member has no WIOA self-screening on file' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: memberId },
    data: {
      wioaReviewStatus: parsed.data.status,
      wioaReviewNotes: parsed.data.notes?.trim() || null,
      wioaReviewedAt: now,
      wioaReviewedByUserId: actor.id,
    },
  });

  return NextResponse.json({
    ok: true,
    wioaReviewStatus: parsed.data.status,
    wioaReviewedAt: now.toISOString(),
    wioaReviewedByUserId: actor.id,
    wioaReviewNotes: parsed.data.notes?.trim() || null,
  });
}
