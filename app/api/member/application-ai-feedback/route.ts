import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApplicationAiFeedbackHowUsed } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  jobApplicationId: z.string().uuid(),
  howUsed: z.nativeEnum(ApplicationAiFeedbackHowUsed),
  primaryAiToolResultId: z.string().uuid().optional().nullable(),
});export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    const { jobApplicationId, howUsed, primaryAiToolResultId } = parsed.data;

    const app = await prisma.$transaction((tx) => tx.jobApplication.findFirst({
      where: { id: jobApplicationId, userId: user.id },
      select: { id: true },
    }));
    if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    if (primaryAiToolResultId) {
      const tool = await prisma.$transaction((tx) => tx.aIToolResult.findFirst({
        where: { id: primaryAiToolResultId, userId: user.id },
        select: { id: true },
      }));
      if (!tool) return NextResponse.json({ error: 'Invalid tool reference' }, { status: 400 });
    }

    await prisma.$transaction((tx) => tx.applicationAiFeedback.upsert({
      where: { jobApplicationId },
      create: {
        jobApplicationId,
        userId: user.id,
        howUsed,
        primaryAiToolResultId: primaryAiToolResultId ?? null,
      },
      update: {
        howUsed,
        primaryAiToolResultId: primaryAiToolResultId ?? null,
      },
    }));

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureApiError(error, { route: 'POST /api/member/application-ai-feedback' });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
});
