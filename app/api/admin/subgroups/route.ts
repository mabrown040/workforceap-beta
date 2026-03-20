import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const SUBGROUP_TYPES = ['partner', 'manager', 'church'] as const;

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(SUBGROUP_TYPES),
  leaderId: z.string().uuid(),
  partnerId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subgroups = await prisma.subgroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json(subgroups);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { name, type, leaderId, partnerId, description } = parsed.data;

  if (type === 'partner' && partnerId) {
    const partner = await prisma.partner.findFirst({ where: { id: partnerId, active: true } });
    if (!partner) {
      return NextResponse.json({ error: 'Invalid or inactive partner' }, { status: 400 });
    }
  }

  const leader = await prisma.user.findUnique({ where: { id: leaderId }, select: { id: true } });
  if (!leader) {
    return NextResponse.json({ error: 'Leader user not found' }, { status: 400 });
  }

  const subgroup = await prisma.subgroup.create({
    data: {
      name,
      type,
      leaderId,
      partnerId: type === 'partner' ? partnerId ?? null : null,
      description: description ?? null,
      createdBy: user.id,
    },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json(subgroup, { status: 201 });
}
