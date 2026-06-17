import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/admin/members/[id]/reset-password
 *
 * Sends a password-reset email to the member via Supabase Auth.
 * Super-admin only. xAPI audit logged for security traceability.
 *
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * The `user.findUnique` goes through `withTenantScope` so a super
 * admin from Org A cannot trigger a reset email for an Org B member by
 * guessing their UUID.
 */
async function _POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdmin(admin.id))) {
      return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 });
    }
  
    const { id } = await params;
    const orgId = await getActorOrganizationId(admin.id);
  
    const member = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { email: true, fullName: true },
      }),
    );
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  
    try {
      const { error } = await sendPasswordResetEmail(member.email, '/reset-password', { orgId });
      if (error) throw error;

      // xAPI audit: credential reset action
      await logAuditEvent({
        user: { id: admin.id, role: 'super_admin' },
        verb: 'reset',
        object: { type: 'UserCredential', id },
        result: { success: true, extensions: { targetEmail: member.email, orgId } },
        request: auditRequestMeta(request),
        orgId,
      }).catch((err) => console.error('[audit] member reset-password:', err));
  
      return NextResponse.json({ success: true, message: `Password reset email sent to ${member.email}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send reset email';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/members/[id]/reset-password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
