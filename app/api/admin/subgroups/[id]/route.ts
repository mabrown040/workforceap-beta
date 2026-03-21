import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const SUBGROUP_TYPES = ['partner', 'manager', 'church'] as const;

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(SUBGROUP_TYPES).optional(),
  leaderId: z.string().uuid().optional(),
  partnerId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const subgroup = await prisma.subgroup.findUnique({ where: { id } });
  if (!subgroup) return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.type != null) data.type = parsed.data.type;
  if (parsed.data.leaderId != null) {
    const leader = await prisma.user.findUnique({ where: { id: parsed.data.leaderId }, select: { id: true } });
    if (!leader) return NextResponse.json({ error: 'Leader user not found' }, { status: 400 });
    data.leaderId = parsed.data.leaderId;
  }
  if (parsed.data.partnerId !== undefined) {
    data.partnerId = parsed.data.partnerId;
    if (parsed.data.partnerId && subgroup.type === 'partner') {
      const partner = await prisma.partner.findFirst({ where: { id: parsed.data.partnerId, active: true } });
      if (!partner) return NextResponse.json({ error: 'Invalid or inactive partner' }, { status: 400 });
    }
  }
  if (parsed.data.description !== undefined) data.description = parsed.data.description;

  const updated = await prisma.subgroup.update({
    where: { id },
    data,
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const subgroup = await prisma.subgroup.findUnique({ where: { id } });
  if (!subgroup) return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });

  await prisma.subgroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
