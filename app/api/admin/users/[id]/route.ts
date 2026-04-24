import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ADMIN_USER_ROLES, ensureProfileRole, syncManagedUserRoles } from '@/lib/admin/adminUserProvisioning';

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

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  try {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });

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

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
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

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          fullName,
          email: normalizedEmail,
        },
        select: { id: true, fullName: true, email: true },
      });

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
        ...user,
        role: profile?.role ?? 'member',
      };
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('[admin/users/:id PATCH]', error);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
