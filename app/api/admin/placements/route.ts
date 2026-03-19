import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const placementSchema = z.object({
  userId: z.string().uuid(),
  employerName: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(200),
  startDate: z.string().optional().nullable(),
  salaryOffered: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const placements = await prisma.placementRecord.findMany({
    orderBy: { placedAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, email: true, enrolledProgram: true } },
    },
  });
  return NextResponse.json(placements);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = placementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });

  const { userId, employerName, jobTitle, startDate, salaryOffered, notes } = parsed.data;

  const member = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const placement = await prisma.placementRecord.upsert({
    where: { userId },
    create: {
      userId,
      employerName,
      jobTitle,
      startDate: startDate ? new Date(startDate) : null,
      salaryOffered: salaryOffered ?? null,
      placedBy: user.id,
      notes: notes ?? null,
    },
    update: {
      employerName,
      jobTitle,
      startDate: startDate ? new Date(startDate) : null,
      salaryOffered: salaryOffered ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(placement, { status: 201 });
}