import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { FundingSource } from '@prisma/client';

const bodySchema = z.object({
  fundingSource: z.nativeEnum(FundingSource).optional().nullable(),
  fundingNotes: z.string().max(8000).optional().nullable(),
  workspaceEmail: z.string().email().max(320).optional().nullable(),
  workspaceEmailProvisioned: z.boolean().optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

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

  const d = parsed.data;

  // Update CourseEnrollment if it exists; also sync workspaceEmail to User
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId: memberId },
  });

  if (enrollment) {
    await prisma.courseEnrollment.update({
      where: { userId: memberId },
      data: {
        fundingSource: d.fundingSource ?? null,
        fundingNotes: d.fundingNotes ?? null,
        workspaceEmail: d.workspaceEmail ?? null,
        workspaceEmailProvisioned: d.workspaceEmailProvisioned ?? false,
      },
    });
  }

  // Always sync workspaceEmail + provisioned flag to User
  await prisma.user.update({
    where: { id: memberId },
    data: {
      workspaceEmail: d.workspaceEmail ?? null,
      workspaceEmailProvisioned: d.workspaceEmailProvisioned ?? false,
    },
  });

  return NextResponse.json({ ok: true });
}
