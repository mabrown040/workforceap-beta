import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { WIOA_REVIEW_STATUSES } from '@/lib/wioa/wioaReview';
import {
  COUNSELOR_WIOA_STATUS_FORBIDDEN_MESSAGE,
  canReviewActorActOnMember,
  canReviewActorSetWioaStatus,
  resolveReviewActor,
} from '@/lib/counselor/applicationReviewAccess';
import { recordWioaReviewSnapshot } from '@/lib/wioa/reviewSnapshot';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Both the lookup and the update go through `withTenantScope`. Using
 * `updateMany` instead of `update` so the proxy can inject the
 * `organizationId` filter — Prisma's `update` requires a unique where
 * input. An admin from Org A cannot review an Org B member's WIOA
 * screening by guessing the UUID.
 *
 * 2026-09-19: active counselors may also record the review, limited to
 * members assigned to them and to intake statuses (never `not_eligible`);
 * see `lib/counselor/applicationReviewAccess.ts`.
 */

const bodySchema = z.object({
  status: z.enum(WIOA_REVIEW_STATUSES),
  notes: z.string().max(8000).optional().nullable(),
});

type Props = { params: Promise<{ id: string }> };

async function _PATCH(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const actor = await resolveReviewActor(user.id);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  if (!(await canReviewActorActOnMember(actor, memberId))) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  const orgId = await getActorOrganizationId(user.id);

  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, wioaQualificationJson: true },
    }),
  );
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (!member.wioaQualificationJson) {
    return NextResponse.json({ error: 'Member has no WIOA self-screening on file' }, { status: 400 });
  }

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
  if (!canReviewActorSetWioaStatus(actor, parsed.data.status)) {
    return NextResponse.json({ error: COUNSELOR_WIOA_STATUS_FORBIDDEN_MESSAGE }, { status: 403 });
  }

  const now = new Date();
  await withTenantScope(orgId, (db) =>
    db.user.updateMany({
      where: { id: memberId },
      data: {
        wioaReviewStatus: parsed.data.status,
        wioaReviewNotes: parsed.data.notes?.trim() || null,
        wioaReviewedAt: now,
        wioaReviewedByUserId: user.id,
      },
    }),
  );

  await recordWioaReviewSnapshot({
    organizationId: orgId,
    userId: memberId,
    source: 'wioa_review',
    decision: parsed.data.status,
    notes: parsed.data.notes?.trim() || null,
    actorUserId: user.id,
  });

  void auditLog({ actorUserId: user.id, action: 'member_wioa_review', targetType: 'user', targetId: memberId, metadata: { status: parsed.data.status } }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: actor.role },
    verb: 'wioa_review',
    object: { type: 'User', id: memberId },
    result: { success: true, extensions: { status: parsed.data.status } },
    request: auditRequestMeta(request),
    orgId,
  }).catch(() => {});
  return NextResponse.json({
    ok: true,
    wioaReviewStatus: parsed.data.status,
    wioaReviewedAt: now.toISOString(),
    wioaReviewedByUserId: user.id,
    wioaReviewNotes: parsed.data.notes?.trim() || null,
  });

  } catch (error) {
    console.error('/admin/members/[id]/wioa-review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

