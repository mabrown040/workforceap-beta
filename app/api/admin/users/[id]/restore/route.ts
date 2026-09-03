import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope, crossTenantOK } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { isDeletedEmailMarker, parseDeletedEmail } from '../../_deletedEmail';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reenableAuthUserAfterRestore } from '@/lib/admin/authUserLifecycle';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const actor = await getUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(actor.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const { id } = await params;
    const orgId = await getActorOrganizationId(actor.id);
  
    const target = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { id: true, email: true, deletedAt: true, fullName: true, phone: true },
      }),
    );
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!target.deletedAt) {
      return NextResponse.json({ error: 'User is not soft-deleted; nothing to restore.' }, { status: 400 });
    }
  
    // If the email was rewritten, try to restore the original.
    let restoredEmail: string | null = null;
    let emailToWrite = target.email;
  
    const candidate = parseDeletedEmail(target.email);
    if (candidate) {
      // User.email is @unique GLOBALLY — collisions in other tenants would
      // still trigger P2002 on the update below. Use crossTenantOK so the
      // pre-check sees them and surfaces a clean 409.
      const colliding = await crossTenantOK(() =>
        prisma.user.findFirst({
          where: { email: candidate, NOT: { id } },
          select: { id: true },
        }),
      );
      if (colliding) {
        return NextResponse.json(
          {
            error: `Cannot restore: another user (${colliding.id.slice(0, 8)}…) is currently using ${candidate}. Free or delete that account first.`,
          },
          { status: 409 },
        );
      }
      emailToWrite = candidate;
      restoredEmail = candidate;
    } else if (isDeletedEmailMarker(target.email)) {
      return NextResponse.json(
        { error: 'Cannot restore: deleted email marker is invalid and the original email cannot be recovered.' },
        { status: 409 },
      );
    }
  
    try {
      await withTenantScope(orgId, (db) =>
        db.user.updateMany({
          where: { id },
          data: { deletedAt: null, email: emailToWrite },
        }),
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email collision on restore. Another active user has this address.' },
          { status: 409 },
        );
      }
      throw err;
    }
  
    // Bring the login back too. Soft delete bans the auth user (or, before
    // 9/2/26, hard-deleted it); either way the member cannot sign in until
    // this succeeds, so a failure here is reported, not swallowed.
    let authRestore: string;
    try {
      const result = await reenableAuthUserAfterRestore(getSupabaseAdmin(), {
        id,
        email: emailToWrite,
        fullName: target.fullName,
        phone: target.phone,
      });
      if (!result.ok) {
        console.error('[admin/users/:id/restore] auth user restore failed:', result.message);
        return NextResponse.json(
          {
            ok: true,
            restoredEmail,
            authRestored: false,
            warning: `Account row restored, but sign-in is still disabled: ${result.message}`,
          },
          { status: 207 },
        );
      }
      authRestore = result.action;
    } catch (err) {
      console.error('[admin/users/:id/restore] auth user restore threw:', err);
      return NextResponse.json(
        {
          ok: true,
          restoredEmail,
          authRestored: false,
          warning: 'Account row restored, but the sign-in could not be re-enabled. Check SUPABASE_SERVICE_ROLE_KEY and retry.',
        },
        { status: 207 },
      );
    }

    await auditLog({
      actorUserId: actor.id,
      action: 'user_restore',
      targetType: 'user',
      targetId: id,
      metadata: { orgId, restoredEmail, authRestore },
    });
    const actorRole = (await isSuperAdmin(actor.id)) ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: actor.id, role: actorRole },
      verb: 'approved',
      object: { type: 'User', id },
      result: { success: true, extensions: { restoredEmail, orgId } },
      request: auditRequestMeta(_req),
      orgId,
    }).catch((err) => console.error('[audit] user restore:', err));

    return NextResponse.json({
      ok: true,
      restoredEmail,
      authRestored: true,
      authRestore,
      message:
        authRestore === 'recreated'
          ? 'Account restored. The login was re-created; ask the member to use "Reset password" to set a new password.'
          : 'Account restored. The member can sign in with their previous password.',
    });
  } catch (error) {
    console.error('/admin/users/[id]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
