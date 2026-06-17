import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { WIOA_REVIEW_STATUSES } from '@/lib/wioa/wioaReview';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Both the lookup and the update go through `withTenantScope`. Using
 * `updateMany` instead of `update` so the proxy can inject the
 * `organizationId` filter — Prisma's `update` requires a unique where
 * input. An admin from Org A cannot review an Org B member's WIOA
 * screening by guessing the UUID.
 */

const bodySchema = z.object({
  status: z.enum(WIOA_REVIEW_STATUSES),
  notes: z.string().max(8000).optional().nullable(),
});

type Props = { params: Promise<{ id: string }> };

async function _PATCH(request: NextRequest, { params }: Props) {
  try {
  const actor = await getUser();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(actor.id);

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

  const now = new Date();
  await withTenantScope(orgId, (db) =>
    db.user.updateMany({
      where: { id: memberId },
      data: {
        wioaReviewStatus: parsed.data.status,
        wioaReviewNotes: parsed.data.notes?.trim() || null,
        wioaReviewedAt: now,
        wioaReviewedByUserId: actor.id,
      },
    }),
  );

  logAuditEvent({
    user: { id: actor.id, role: 'admin' },
    verb: 'wioa_review',
    object: { type: 'User', id: memberId },
    result: { success: true, extensions: { status: parsed.data.status } },
    request: auditRequestMeta(request),
    orgId,
  }).catch((err) => console.error('[audit] wioa_review:', err));

  return NextResponse.json({
    ok: true,
    wioaReviewStatus: parsed.data.status,
    wioaReviewedAt: now.toISOString(),
    wioaReviewedByUserId: actor.id,
    wioaReviewNotes: parsed.data.notes?.trim() || null,
  });

  } catch (error) {
    console.error('/admin/members/[id]/wioa-review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

