import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { detectCompletionMilestone } from '@/lib/milestoneCascade/detectCompletionMilestone';
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
 *   { "courseName": "Synthetic PMF", "courseSlug": "synthetic-pmf", "userId": "..." }
 *
 * All fields optional. Defaults to the caller's userId and a deterministic
 * test course. The same idempotency key applies — calling twice for the same
 * (userId, courseSlug) is a no-op.
 */

const bodySchema = z.object({
  userId: z.string().uuid().optional(),
  courseSlug: z.string().min(1).max(120).optional(),
  courseName: z.string().min(1).max(200).optional(),
  programSlug: z.string().min(1).max(120).optional(),
  completedCount: z.number().int().min(0).max(100).optional(),
});

async function _POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const targetUserId = parsed.data.userId ?? user.id;

    // Tenant scope: a tenant admin can only trigger synthetic cascades for
    // learners in their own organization. Super-admins bypass the scope so
    // they can exercise the flow across tenants.
    const isSuper = await isSuperAdmin(user.id);
    const orgId = isSuper ? null : await getActorOrganizationId(user.id);

    const targetUser = await prisma.user.findFirst({
      where: orgId ? { id: targetUserId, organizationId: orgId } : { id: targetUserId },
      select: { id: true },
    });
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
