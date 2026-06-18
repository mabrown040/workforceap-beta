import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { detectCompletionMilestone } from '@/lib/milestoneCascade/detectCompletionMilestone';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Admin-only synthetic cascade trigger. Inserts a `pending_draft` row for the
 * caller (or a specified userId) so we can exercise the drafting cron +
 * approve/dismiss flow end-to-end without waiting for a real Coursera
 * completion event.
 *
 * Restricted to admins (not counselors) — this is debug infrastructure, not
 * a counselor workflow.
 *
 * Usage:
 *   POST /api/admin/milestone-cascades/synthetic
 *   Body (all optional):
 *     { userId, courseSlug, courseName, programSlug, completedCount }
 */

const bodySchema = z.object({
  userId: z.string().uuid().optional(),
  courseSlug: z.string().optional(),
  courseName: z.string().optional(),
  programSlug: z.string().nullable().optional(),
  completedCount: z.number().int().min(1).max(20).optional(),
});

async function _POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const targetUserId = parsed.data.userId ?? user.id;
    const isSuper = await isSuperAdmin(user.id);
    const orgId = isSuper ? null : await getActorOrganizationId(user.id);

    const targetUser = await prisma.$transaction((tx) => tx.user.findFirst({
      where: orgId ? { id: targetUserId, organizationId: orgId } : { id: targetUserId },
      select: { id: true },
    }));
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Distinctive default slug so synthetic cascades are easy to spot in the
    // DB and don't collide with real Coursera content.
    const result = await detectCompletionMilestone({
      userId: targetUserId,
      courseSlug: parsed.data.courseSlug ?? `synthetic-${Date.now()}`,
      courseName: parsed.data.courseName ?? 'Synthetic Test Course',
      programSlug: parsed.data.programSlug ?? null,
      completedCount: parsed.data.completedCount ?? 1,
      // 'member' source so it isn't filtered out as enterprise-sync backfill.
      source: 'member',
      sourceEventId: `synthetic-${user.id}-${Date.now()}`,
    });

    auditLog({
      actorUserId: user.id,
      action: 'admin_synthetic_milestone',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { courseSlug: parsed.data.courseSlug ?? null, programSlug: parsed.data.programSlug ?? null },
    }).catch((err) => console.error('[audit] admin_synthetic_milestone:', err));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[milestone-cascade synthetic] unhandled:', err);
    return NextResponse.json(
      { error: 'Synthetic insert failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
export const POST = withApiGuc(_POST);
