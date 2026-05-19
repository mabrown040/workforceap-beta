import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from "@/lib/tenant/organization";
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
  
      return NextResponse.json({ success: true, message: `Password reset email sent to ${member.email}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send reset email';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/members/[id]/reset-password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
