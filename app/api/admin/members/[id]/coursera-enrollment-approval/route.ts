import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { auditLog } from '@/lib/audit';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId, getSubjectOrganizationId } from '@/lib/tenant/organization';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { logAuditEvent } from '@/lib/audit/log';

/**
 * PATCH /api/admin/members/[id]/coursera-enrollment-approval
 * Body: `{ approved: boolean }`
 *
 * Admin-only toggle for the Coursera enrollment eligibility flag. The
 * inline copy in the UI is intentionally cautious: "Approving lets this
 * member self-enroll in their Coursera courses. Don't approve unless
 * funding is confirmed and counselor has assigned a program." — every
 * approval costs a paid Coursera seat as soon as the member clicks
 * Enroll, so this is the gate the budget depends on.
 *
 * Both directions (true → false and false → true) are recorded in
 * `audit_logs` with the admin's user id. Revoking the flag does NOT
 * unenroll the member from any courses they've already started on
 * Coursera — those seats are already spent. See
 * `docs/COURSERA-ENROLLMENT-FLOW.md` "How to revoke".
 */
const patchSchema = z.object({
  approved: z.boolean(),
});

async function _PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user.id);

  const { id: memberId } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const approved = parsed.data.approved;

  // Tenant scoping: route the write through the subject's org, not the
  // actor's. A super_admin viewing a partner-org member must mutate the
  // partner-org row, not their own.
  const subjectOrgId = await getSubjectOrganizationId(memberId);
  // Belt-and-suspenders: assert the actor is allowed in this org. For
  // super_admins this returns the same id; for org-scoped admins this
  // would throw if they tried to flip a flag in a foreign org.
  const actorOrgId = await getActorOrganizationId(user.id);
  if (actorOrgId !== subjectOrgId) {
    // Block cross-tenant flips. super_admins bypass requireAdmin's
    // org-bind, so this final check matters for them specifically.
    return NextResponse.json({ error: 'Forbidden — cross-tenant' }, { status: 403 });
  }

  const now = new Date();
  await withTenantScope(subjectOrgId, async (db) => {
    await db.user.update({
      where: { id: memberId },
      data: {
        courseraEnrollmentApproved: approved,
        // Stamp who/when on every flip — including revocations — so the
        // audit trail in the DB column matches what audit_logs records.
        courseraEnrollmentApprovedAt: now,
        courseraEnrollmentApprovedById: user.id,
      },
    });
  });

  await auditLog({
    actorUserId: user.id,
    action: approved
      ? 'coursera_enrollment_approved'
      : 'coursera_enrollment_revoked',
    targetType: 'User',
    targetId: memberId,
    metadata: {
      source: 'admin_toggle',
      approved,
    },
  });

  return NextResponse.json({ ok: true, approved });

  } catch (error) {
    console.error('/admin/members/[id]/coursera-enrollment-approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
