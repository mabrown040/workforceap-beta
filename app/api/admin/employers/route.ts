import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const employerSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(1).max(200),
  companyWebsite: z.string().url().optional().nullable(),
  companyDescription: z.string().min(1).optional().nullable(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(50).optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const employers = await prisma.employer.findMany({
    orderBy: { companyName: 'asc' },
    include: {
      user: { select: { email: true, fullName: true } },
      _count: { select: { jobs: true } },
    },
  });

  return NextResponse.json(employers);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = employerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 400 });

  const existingEmployer = await prisma.employer.findUnique({
    where: { userId: parsed.data.userId },
    select: { id: true },
  });
  if (existingEmployer) return NextResponse.json({ error: 'User is already an employer' }, { status: 400 });

  const employer = await prisma.employer.create({
    data: {
      userId: parsed.data.userId,
      companyName: parsed.data.companyName,
      companyWebsite: parsed.data.companyWebsite ?? undefined,
      companyDescription: parsed.data.companyDescription ?? undefined,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone ?? undefined,
    },
  });

  return NextResponse.json(employer, { status: 201 });
}
