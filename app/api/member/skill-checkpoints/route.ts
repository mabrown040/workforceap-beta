import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { trackEvent } from '@/lib/events/track';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getCheckpointById } from '@/lib/content/checkpoints';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  checkpointId: z.string().min(1),
  programSlug: z.string().min(1),
  courseSlug: z.string().min(1),
  passed: z.boolean(),
});

async function _POST(request: NextRequest) {
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
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const { checkpointId, programSlug, courseSlug, passed } = parsed.data;

    const checkpoint = getCheckpointById(checkpointId);
    if (!checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 400 });
    }

    try {
      await ensureUserInDb(user);
      await trackEvent({
        userId: user.id,
        eventName: 'skill_checkpoint_completed',
        entityType: 'skill_checkpoint',
        entityId: checkpointId,
        metadata: { programSlug, courseSlug, passed, demonstratedSkill: checkpoint.demonstratedSkill },
        sourcePage: '/dashboard/ai-tools/skill-checkpoints',
      });

      return NextResponse.json({ ok: true });
    } catch (err) {
      captureApiError(err, { route: 'member/skill-checkpoints POST' });
      return NextResponse.json({ error: 'Failed to record checkpoint' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/skill-checkpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
