import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const bodySchema = z.object({
  employerName: z.string().min(1).max(300).trim(),
  jobTitle: z.string().min(1).max(300).trim(),
  startingSalary: z.number().int().min(0).optional().nullable(),
  placedAt: z.string().datetime().optional(),
  programSlug: z.string().max(120).optional().nullable(),
  notes: z.string().max(8000).optional().nullable(),
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
  const placedAt = d.placedAt ? new Date(d.placedAt) : new Date();

  const row = await prisma.placedOutcome.upsert({
    where: { userId: memberId },
    create: {
      userId: memberId,
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      startingSalary: d.startingSalary ?? null,
      placedAt,
      programSlug: d.programSlug?.trim() || null,
      notes: d.notes?.trim() || null,
    },
    update: {
      employerName: d.employerName,
      jobTitle: d.jobTitle,
      startingSalary: d.startingSalary ?? null,
      placedAt,
      programSlug: d.programSlug?.trim() || null,
      notes: d.notes?.trim() || null,
    },
  });

  return NextResponse.json({
    ok: true,
    placedOutcome: {
      id: row.id,
      employerName: row.employerName,
      jobTitle: row.jobTitle,
      startingSalary: row.startingSalary,
      placedAt: row.placedAt.toISOString(),
      programSlug: row.programSlug,
      notes: row.notes,
    },
  });
}
