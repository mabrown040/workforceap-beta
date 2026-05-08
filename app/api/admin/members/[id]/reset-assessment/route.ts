import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Switched the `prisma.user.update` to a scoped `updateMany` so the
 * proxy injects `organizationId` into the where clause. An admin from
 * Org A cannot reset an Org B member's assessment by guessing the UUID
 * — the updateMany simply matches zero rows. We use `updateMany`
 * (instead of `update`) because Prisma's `update` requires a unique
 * where input that the proxy can't extend.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;
    const orgId = await getDefaultOrganizationId();

    const result = await withTenantScope(orgId, (db) =>
      db.user.updateMany({
        where: { id },
        data: {
          assessmentCompleted: false,
          assessmentCompletedAt: null,
          assessmentScore: null,
          assessmentScorePct: null,
          assessmentAnswers: Prisma.JsonNull,
          programInterest: null,
        },
      }),
    );

    if (result.count === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/members/[id]/reset-assessment POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
