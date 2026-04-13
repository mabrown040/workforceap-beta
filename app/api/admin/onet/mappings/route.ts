import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  onetCode: z.string().min(1),
  programSlug: z.string().min(1),
  priority: z.number().int().min(1).max(99).default(1),
  experienceBand: z.enum(['beginner', 'some_experience', 'experienced']),
  recommendationType: z.enum(['primary', 'bridge', 'stretch']),
  whyRecommended: z.string().max(10000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onetCode = searchParams.get('onetCode')?.trim();
  const programSlug = searchParams.get('programSlug')?.trim();

  const rows = await prisma.careerProgramMapping.findMany({
    where: {
      ...(onetCode ? { onetCode } : {}),
      ...(programSlug ? { programSlug } : {}),
    },
    orderBy: [{ onetCode: 'asc' }, { experienceBand: 'asc' }, { priority: 'asc' }],
    take: 500,
  });

  return NextResponse.json({ mappings: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (!getProgramBySlug(data.programSlug)) {
    return NextResponse.json({ error: 'Unknown programSlug' }, { status: 400 });
  }

  await prisma.onetOccupation.upsert({
    where: { onetCode: data.onetCode },
    create: {
      onetCode: data.onetCode,
      title: data.onetCode,
      isActive: true,
    },
    update: {},
  });

  if (data.id) {
    const row = await prisma.careerProgramMapping.update({
      where: { id: data.id },
      data: {
        onetCode: data.onetCode,
        programSlug: data.programSlug,
        priority: data.priority,
        experienceBand: data.experienceBand,
        recommendationType: data.recommendationType,
        whyRecommended: data.whyRecommended ?? null,
        isActive: data.isActive ?? true,
      },
    });
    return NextResponse.json({ mapping: row });
  }

  const row = await prisma.careerProgramMapping.create({
    data: {
      onetCode: data.onetCode,
      programSlug: data.programSlug,
      priority: data.priority,
      experienceBand: data.experienceBand,
      recommendationType: data.recommendationType,
      whyRecommended: data.whyRecommended ?? null,
      isActive: data.isActive ?? true,
    },
  });
  return NextResponse.json({ mapping: row });
}
