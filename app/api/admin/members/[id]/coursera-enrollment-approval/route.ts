import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, requireAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId, getSubjectOrganizationId } from '@/lib/tenant/organization';
import { auditRequestMeta } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { setCourseraEnrollmentApproval } from '@/lib/admin/courseraEnrollmentApproval';

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
  const actorOrgId = await getActorOrganizationId(user.id);
  if (actorOrgId !== subjectOrgId) {
    return NextResponse.json({ error: 'Forbidden — cross-tenant' }, { status: 403 });
  }

  const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
  const result = await setCourseraEnrollmentApproval({
    memberId,
    approved,
    orgId: subjectOrgId,
    actorUserId: user.id,
    actorRole,
    requestMeta: auditRequestMeta(request),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, approved: result.approved });

  } catch (error) {
    console.error('/admin/members/[id]/coursera-enrollment-approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
