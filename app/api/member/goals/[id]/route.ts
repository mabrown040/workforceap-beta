import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  targetMetricValue: z.number().int().min(0).optional(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED']).optional(),
});

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.targetMetricValue !== undefined) data.targetMetricValue = parsed.data.targetMetricValue;
  if (parsed.data.targetDate !== undefined) data.targetDate = parsed.data.targetDate ? new Date(parsed.data.targetDate) : null;
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === 'COMPLETED') data.completedAt = new Date();
  }

  const goal = await prisma.goal.update({
    where: { id },
    data,
  });

  if (parsed.data.status === 'COMPLETED') {
    await trackEvent({ userId: user.id, eventName: 'goal_completed', entityType: 'goal', entityId: goal.id });
  } else {
    await trackEvent({ userId: user.id, eventName: 'goal_updated', entityType: 'goal', entityId: goal.id });
  }

  return NextResponse.json({ goal });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
