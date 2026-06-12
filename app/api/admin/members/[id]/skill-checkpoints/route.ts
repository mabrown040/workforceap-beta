import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { recordSkillCheckpointDecision } from '@/lib/member/skillCheckpoints';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  checkpointKey: z.string().min(1).max(200),
  decision: z.enum(['passed', 'needs_retry']),
  notes: z.string().max(4000).optional().nullable(),
  programSlug: z.string().min(1).max(160),
});

type Props = { params: Promise<{ id: string }> };

export const POST = withApiGuc(async (request: NextRequest, { params }: Props) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: memberId } = await params;
    const orgId = await getActorOrganizationId(user.id);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        deletedAt: null,
        organizationId: orgId,
      },
      select: {
        id: true,
        enrolledProgram: true,
      },
    });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.enrolledProgram !== parsed.data.programSlug) {
      return NextResponse.json(
        { error: 'Checkpoint program does not match the member’s active program.' },
        { status: 400 },
      );
    }

    await recordSkillCheckpointDecision({
      actorUserId: user.id,
      checkpointKey: parsed.data.checkpointKey,
      decision: parsed.data.decision,
      memberId,
      notes: parsed.data.notes,
      programSlug: parsed.data.programSlug,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/api/admin/members/[id]/skill-checkpoints error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
