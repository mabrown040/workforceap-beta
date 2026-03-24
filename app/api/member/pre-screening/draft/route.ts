import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const draftSchema = z.object({
  employmentStatus: z.string().max(50).optional(),
  primaryGoal: z.string().max(80).optional(),
  weeklyHours: z.string().max(40).optional(),
  barrier: z.string().max(200).optional(),
  hearAbout: z.string().max(200).optional(),
  hearAboutOther: z.string().max(200).optional().nullable(),
  workforceAssistance: z.enum(['yes', 'no', '']).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.preScreeningResponse.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ draft: null });
  }

  const row = await prisma.preScreeningDraft.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({ draft: row });
}

export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { assessmentCompleted: true },
  });
  if (!dbUser?.assessmentCompleted) {
    return NextResponse.json({ error: 'Complete your assessment first.' }, { status: 400 });
  }

  const submitted = await prisma.preScreeningResponse.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (submitted) {
    return NextResponse.json({ error: 'Pre-screening already submitted.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const d = parsed.data;
  const wa =
    d.workforceAssistance === 'yes' ? true : d.workforceAssistance === 'no' ? false : undefined;

  await prisma.preScreeningDraft.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      employmentStatus: d.employmentStatus ?? null,
      primaryGoal: d.primaryGoal ?? null,
      weeklyHours: d.weeklyHours ?? null,
      barrier: d.barrier ?? null,
      hearAbout: d.hearAbout ?? null,
      hearAboutOther: d.hearAboutOther ?? null,
      workforceAssistance: wa ?? null,
      phone: d.phone ?? null,
      address: d.address ?? null,
    },
    update: {
      ...(d.employmentStatus !== undefined ? { employmentStatus: d.employmentStatus || null } : {}),
      ...(d.primaryGoal !== undefined ? { primaryGoal: d.primaryGoal || null } : {}),
      ...(d.weeklyHours !== undefined ? { weeklyHours: d.weeklyHours || null } : {}),
      ...(d.barrier !== undefined ? { barrier: d.barrier || null } : {}),
      ...(d.hearAbout !== undefined ? { hearAbout: d.hearAbout || null } : {}),
      ...(d.hearAboutOther !== undefined ? { hearAboutOther: d.hearAboutOther } : {}),
      ...(d.workforceAssistance !== undefined ? { workforceAssistance: wa ?? null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
      ...(d.address !== undefined ? { address: d.address || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
