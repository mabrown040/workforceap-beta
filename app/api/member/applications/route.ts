import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  status: z.enum(['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED']).optional().default('SAVED'),
  appliedAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const applications = await prisma.jobApplication.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { company, role, status, appliedAt, notes, url } = parsed.data;

  const app = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company,
      role,
      status,
      appliedAt: appliedAt ? new Date(appliedAt) : null,
      notes: notes || null,
      url: url || null,
    },
  });

  return NextResponse.json({ application: app });
}
