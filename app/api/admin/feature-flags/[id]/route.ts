import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, enabled, rolloutPercentage, allowedRoles } = body;

    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name?.trim() ?? existing.name;
    if (description !== undefined) update.description = description?.trim() || null;
    if (enabled !== undefined) update.enabled = !!enabled;
    if (rolloutPercentage !== undefined) {
      update.rolloutPercentage = Math.max(0, Math.min(100, Number(rolloutPercentage) || 0));
    }
    if (allowedRoles !== undefined) {
      update.allowedRoles = Array.isArray(allowedRoles)
        ? allowedRoles.filter((r: string) => typeof r === 'string')
        : existing.allowedRoles;
    }

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('[admin/feature-flags/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.featureFlag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/feature-flags/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
