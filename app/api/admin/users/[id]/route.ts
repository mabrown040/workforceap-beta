import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { ADMIN_USER_ROLES, ensureProfileRole, syncManagedUserRoles } from '@/lib/admin/adminUserProvisioning';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 4).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Both DELETE and PATCH go through `withTenantScope` so a (super)admin
 * from Org A cannot delete or rename an Org B user by guessing their
 * UUID. `findUnique` becomes `findFirst` and `update` becomes
 * `updateMany` so the proxy can inject the `organizationId` filter
 * (Prisma's `update` requires a unique-only where input).
 */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}

const schema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  role: z.enum(ADMIN_USER_ROLES).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  try {
    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase();

    if (normalizedEmail !== existing.email.toLowerCase()) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        email: normalizedEmail,
        email_confirm: true,
      });
      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Membership has already been verified above, so the User update goes
    // through `withTenantScope` (using `updateMany` so the proxy can scope
    // the where clause). Profile / UserRole are platform-level — they
    // inherit tenancy via FK to User and stay on the raw transaction
    // client. The actor's tenant gate is `existing` above.
    const userUpdated = await withTenantScope(orgId, (db) =>
      db.user.updateMany({
        where: { id },
        data: { fullName, email: normalizedEmail },
      }),
    );
    if (userUpdated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
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
    console.error('[admin/users/:id PATCH]', error);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
