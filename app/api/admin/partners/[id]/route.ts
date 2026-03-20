import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().max(5000).optional().nullable(),
  subgroupIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: partnerId } = await params;
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const data = parsed.data;

  // Check for duplicate contact email if changing
  if (data.contactEmail !== undefined && data.contactEmail) {
    const existing = await prisma.partner.findFirst({
      where: {
        contactEmail: data.contactEmail.trim().toLowerCase(),
        id: { not: partnerId },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Another partner already uses this contact email' }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.contactName !== undefined) updateData.contactName = data.contactName?.trim() || null;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail?.trim().toLowerCase() || null;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone?.trim() || null;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.partner.update({
        where: { id: partnerId },
        data: updateData,
      });
    }

    if (data.subgroupIds !== undefined) {
      // Clear partner from subgroups that no longer have this partner
      await tx.subgroup.updateMany({
        where: { partnerId, type: 'partner' },
        data: { partnerId: null },
      });
      // Assign partner to selected subgroups (type=partner only)
      if (data.subgroupIds.length > 0) {
        await tx.subgroup.updateMany({
          where: {
            id: { in: data.subgroupIds },
            type: 'partner',
          },
          data: { partnerId },
        });
      }
    }
  });

  const updated = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      subgroups: { select: { id: true, name: true } },
      _count: { select: { counselors: true, referrals: true } },
    },
  });
  return NextResponse.json(updated);
}
