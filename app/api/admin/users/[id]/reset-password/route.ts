import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 3).
 * The `user.findUnique` goes through `withTenantScope` so an admin
 * from Org A cannot trigger a reset email for an Org B user by guessing
 * their UUID.
 */
async function _POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(admin.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const { id } = await params;
    const orgId = await getActorOrganizationId(admin.id);
  
    const user = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { email: true },
      }),
    );
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  
    try {
      const { error } = await sendPasswordResetEmail(user.email, '/reset-password', { orgId });
      if (error) throw error;

      logAuditEvent({
        user: { id: admin.id, role: 'admin' },
        verb: 'reset_password',
        object: { type: 'User', id },
        result: { success: true },
        orgId,
      }).catch((err) => console.error('[audit] reset_password:', err));

      return NextResponse.json({ success: true, message: `Password reset email sent to ${user.email}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send password reset email';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/users/[id]/reset-password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
