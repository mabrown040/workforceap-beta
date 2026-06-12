import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { ADMIN_USER_ROLES, ensureProfileRole, syncManagedUserRoles } from '@/lib/admin/adminUserProvisioning';
import { userAuthDeleteFailedResponse } from '@/lib/admin/userDeleteResponse';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getUser();
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdmin(actor.id))) return NextResponse.json({ error: 'Super admin required.' }, { status: 403 });
  
    const { id } = await params;
  
    if (id === actor.id) {
      return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 400 });
    }
  
    const orgId = await getActorOrganizationId(actor.id);
  
    const target = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { id: true, email: true, deletedAt: true },
      }),
    );
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  
    try {
      // See app/api/admin/members/[id]/delete/route.ts — same pattern.
      // Rewrite the email so the @unique constraint doesn't block re-signup.
      const now = new Date();
      const newEmail = target.deletedAt
        ? target.email
        : `deleted_${id}_${now.getTime()}_${target.email}@deleted.invalid`.slice(0, 255);
  
      await withTenantScope(orgId, (db) =>
        db.user.updateMany({
          where: { id },
          data: { deletedAt: now, email: newEmail },
        }),
      );
  
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) {
        console.error('[admin/users/:id DELETE] Supabase delete error:', error.message);
        return userAuthDeleteFailedResponse();
      }
  
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[admin/users/:id DELETE]', err);
      return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);

const schema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  role: z.enum(ADMIN_USER_ROLES).optional(),
});

async function rollbackSupabaseEmailChange(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  previousEmail: string,
) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email: previousEmail,
    email_confirm: true,
  });
  return error ?? null;
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getUser();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(admin.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
    const { id } = await params;
  
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
  
    const { fullName, email, role } = parsed.data;
  
    const orgId = await getActorOrganizationId(admin.id);
    const existing = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: { id },
        select: { id: true, email: true },
      }),
    );
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  
    if (role && !(await isSuperAdmin(admin.id))) {
      return NextResponse.json({ error: 'Only super admins can change roles.' }, { status: 403 });
    }
  
    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase();
    const emailChanged = normalizedEmail !== existing.email.toLowerCase();
    let authEmailChanged = false;
 
    try {
      if (emailChanged) {
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
          email: normalizedEmail,
          email_confirm: true,
        });
        if (authError) {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        authEmailChanged = true;
      }
  
      // Membership has already been verified via withTenantScope.findFirst above.
      // The User update + Profile / UserRole writes need to be ATOMIC — Codex P2
      // catch on PR #1049: splitting them caused partial-update state when role
      // sync failed after the user write succeeded. Restore the single
      // $transaction with an explicit `organizationId` filter on the user write.
      // This is an atomicity exception — the proxy can't be inserted inside an
      // outer $transaction (the inner `tx` argument is unwrapped). The membership
      // gate from `existing` above is the primary tenant check; the explicit
      // organizationId on this updateMany is belt-and-braces.
      const updated = await prisma.$transaction(async (tx) => {
        const userResult = await tx.user.updateMany({
          where: { id, organizationId: orgId },
          data: { fullName, email: normalizedEmail },
        });
        if (userResult.count === 0) {
          throw new Error('USER_NOT_FOUND_IN_TX');
        }
  
        const profile = role
          ? await ensureProfileRole(tx, id, role)
          : await tx.profile.findFirst({
              where: { userId: id },
              select: { role: true },
            });
  
        if (role) {
          await syncManagedUserRoles(tx, id, role);
        }
  
        return {
          id,
          fullName,
          email: normalizedEmail,
          role: profile?.role ?? 'member',
        };
      });
  
      return NextResponse.json({ success: true, user: updated });
    } catch (error) {
      if (authEmailChanged) {
        try {
          const rollbackError = await rollbackSupabaseEmailChange(supabase, id, existing.email);
          if (rollbackError) {
            console.error('[admin/users/:id PATCH] Supabase email rollback failed:', rollbackError.message);
            return NextResponse.json(
              { error: 'Failed to update user; auth email rollback failed.', reconciliationRequired: true },
              { status: 500 },
            );
          }
        } catch (rollbackError) {
          console.error('[admin/users/:id PATCH] Supabase email rollback failed:', rollbackError);
          return NextResponse.json(
            { error: 'Failed to update user; auth email rollback failed.', reconciliationRequired: true },
            { status: 500 },
          );
        }
      }
      if (error instanceof Error && error.message === 'USER_NOT_FOUND_IN_TX') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('[admin/users/:id PATCH]', error);
      return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
