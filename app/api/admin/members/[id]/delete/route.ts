import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getProfileRole } from '@/lib/auth/roles';

export const POST = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);

    // Soft-delete the Prisma row AND release the email from the unique
    // constraint so a fresh sign-up with the same address can succeed.
    // Without the email rewrite, re-creating a deleted test user (or a
    // real user who deleted their account and wants to come back) hits
    // the User.email @unique constraint and the new account can't be
    // created. We rewrite to a sentinel address that preserves the
    // original for audit (deleted_<userId>_<originalEmail>@deleted.invalid).
    //
    // Tenant scope: lookup + update wrapped in withTenantScope so an
    // admin from Org A cannot delete a member from Org B by guessing
    // their UUID.
    const now = new Date();
    const existing = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { email: true, deletedAt: true },
      }),
    );
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If the row is already soft-deleted, leave its email rewrite alone —
    // don't double-rewrite (would build up nested "deleted_deleted_..."
    // prefixes if an admin clicks delete twice).
    const newEmail = existing.deletedAt
      ? existing.email
      : `deleted_${id}_${now.getTime()}_${existing.email}@deleted.invalid`.slice(0, 255);

    await withTenantScope(orgId, (db) =>
      db.user.update({
        where: { id },
        data: {
          deletedAt: now,
          email: newEmail,
        },
      }),
    );

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      console.error('[admin/members/[id]/delete] Supabase auth delete error:', error.message);
    }

    const profileRole = await getProfileRole(user.id);
    auditLog({ actorUserId: user.id, action: 'admin_member_delete', targetType: 'User', targetId: id, metadata: { orgId } }).catch((err) => console.error('[audit] admin_member_delete:', err));
    await logAuditEvent({
      user: { id: user.id, role: profileRole ?? undefined },
      verb: 'deleted',
      object: { type: 'User', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] member delete:', err));
    auditLog({ actorUserId: user.id, action: 'admin_member_deleted', targetType: 'User', targetId: id, metadata: { orgId } }).catch(() => {});

    return NextResponse.json({ ok: true, originalEmail: existing.email });
  } catch (error) {
    console.error('[admin/members/[id]/delete POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
