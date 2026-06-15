import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { captureApiError } from '@/lib/observability/captureApiError';
import type { PipelineBoardStage } from '@prisma/client';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The findFirst (membership gate) and the user.update both go through
 * `withTenantScope`. Using `updateMany` for the write so the proxy can
 * inject `organizationId` into the where clause — Prisma's `update`
 * requires a unique where input. An admin from Org A cannot reach an
 * Org B member by UUID.
 */

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

    const orgId = await getActorOrganizationId(user.id);

    const target = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id: memberId, deletedAt: null },
        select: { id: true },
      }),
    );
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const stage = parsed.data.stage as PipelineBoardStage | null;

    await withTenantScope(orgId, (db) =>
      db.user.updateMany({
        where: { id: memberId },
        data: { pipelineBoardStage: stage },
      }),
    );

    return NextResponse.json({ ok: true, pipelineBoardStage: stage });
  } catch (error) {
    captureApiError(error, { route: 'PATCH /api/admin/members/[id]/pipeline-stage' });
    return NextResponse.json({ error: 'Failed to update pipeline stage' }, { status: 500 });
  }
}
