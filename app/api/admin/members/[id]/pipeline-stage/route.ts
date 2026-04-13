import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';
import type { PipelineBoardStage } from '@prisma/client';

const bodySchema = z.object({
  stage: z
    .enum(['applied', 'enrolled', 'in_training', 'certified', 'job_searching', 'placed'])
    .nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: memberId } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const stage = parsed.data.stage as PipelineBoardStage | null;

    await prisma.user.update({
      where: { id: memberId },
      data: { pipelineBoardStage: stage },
    });

    return NextResponse.json({ ok: true, pipelineBoardStage: stage });
  } catch (error) {
    captureApiError(error, { route: 'PATCH /api/admin/members/[id]/pipeline-stage' });
    return NextResponse.json({ error: 'Failed to update pipeline stage' }, { status: 500 });
  }
}
