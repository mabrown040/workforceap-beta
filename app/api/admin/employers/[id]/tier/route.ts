import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const tierSchema = z.object({
  tier: z.enum(['basic', 'partner']),
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
  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const employer = await prisma.employer.findUnique({ where: { id } });
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });

  const updated = await prisma.employer.update({
    where: { id },
    data: { tier: parsed.data.tier },
  });

  return NextResponse.json({ id: updated.id, tier: updated.tier });
}
