import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user.id);

  const { id } = await params;

  await prisma.user.update({
    where: { id },
    data: {
      assessmentCompleted: false,
      assessmentCompletedAt: null,
      assessmentScore: null,
      assessmentScorePct: null,
      assessmentAnswers: Prisma.JsonNull,
      programInterest: null,
    },
  });

  return NextResponse.json({ ok: true });
}
