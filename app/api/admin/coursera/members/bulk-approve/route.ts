import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, requireAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { setCourseraEnrollmentApproval, type CourseraApprovalResult } from '@/lib/admin/courseraEnrollmentApproval';

// Same cap as the existing member bulk-update route.
const MAX_MEMBERS = 100;

const bodySchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1).max(MAX_MEMBERS),
  approved: z.boolean(),
});

/**
 * POST /api/admin/coursera/members/bulk-approve
 * Body: `{ memberIds: string[], approved: boolean }`
 *
 * Bulk sibling of `PATCH /api/admin/members/[id]/coursera-enrollment-approval`
 * for the enrollment command center (`/admin/coursera/enrollment`) — same
 * `setCourseraEnrollmentApproval` core, so the audit trail and member
 * notification behave identically whether an admin approves one seat or
 * fifty. All members must belong to the actor's org (enforced per-row via
 * `withTenantScope` inside the shared helper).
 */
async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const { memberIds, approved } = parsed.data;

    const orgId = await getActorOrganizationId(user.id);
    const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
    const requestMeta = auditRequestMeta(request);

    const results: CourseraApprovalResult[] = [];
    for (const memberId of memberIds) {
      const result = await setCourseraEnrollmentApproval({
        memberId,
        approved,
        orgId,
        actorUserId: user.id,
        actorRole,
        requestMeta,
      });
      results.push(result);
    }

    const processedCount = results.filter((r) => r.ok).length;
    const failed = results.filter((r): r is Extract<CourseraApprovalResult, { ok: false }> => !r.ok);

    return NextResponse.json({
      success: failed.length === 0,
      processedCount,
      failedCount: failed.length,
      failures: failed,
    });
  } catch (error) {
    console.error('/admin/coursera/members/bulk-approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
