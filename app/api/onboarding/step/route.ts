import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  portal: z.enum(['member', 'employer', 'partner']),
  step: z.number().int().min(0).max(50),
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
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid body' },
        { status: 400 }
      );
    }

    const { portal, step } = parsed.data;

    if (portal === 'member') {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingCurrentStep: step },
      });
    } else if (portal === 'employer') {
      const ctx = await getEmployerForUser(user.id);
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await prisma.employer.update({
        where: { id: ctx.employerId },
        data: { onboardingCurrentStep: step },
      });
    } else {
      const ctx = await getPartnerForUser(user.id);
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await prisma.partner.update({
        where: { id: ctx.partnerId },
        data: { onboardingCurrentStep: step },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/api/onboarding/step error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
