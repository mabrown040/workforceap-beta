import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  portal: z.enum(['member']),
  stepIndex: z.number().int().min(0).optional(),
});

export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const now = new Date();
    const { stepIndex } = parsed.data;

    await prisma.user.update({
      where: { id: user.id },
      data: { tourDismissedAt: now },
    });

    void trackEvent({
      userId: user.id,
      eventName: 'onboarding_tour_dismissed',
      sourcePage: '/dashboard',
      metadata: {
        portal: 'member',
        step_index: stepIndex ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/onboarding/tour-dismiss error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
