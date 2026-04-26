import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import {
  ADMIN_USER_ROLES,
  ensureAppUser,
  ensureProfileRole,
  syncManagedUserRoles,
} from '@/lib/admin/adminUserProvisioning';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

/** List users for admin dropdowns (e.g. subgroup leader selection). Returns id, fullName, email. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' },
  });
  return NextResponse.json(users);
}

const createSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  role: z.enum(ADMIN_USER_ROLES).default('member'),
  sendResetEmail: z.boolean().default(true),
});

async function findAuthUserIdByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match?.id) return match.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(admin.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isSuper = await isSuperAdmin(admin.id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { fullName, role, sendResetEmail } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  if (!isSuper && role !== 'member') {
    return NextResponse.json({ error: 'Only super admins can create staff or admin users.' }, { status: 403 });
  }

  const existingDbUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, fullName: true, email: true, profile: { select: { role: true } } },
  });
  if (existingDbUser) {
    return NextResponse.json(
      {
        error: 'That email already has an account. Use the edit or reset tools on the existing user.',
        user: {
          id: existingDbUser.id,
          fullName: existingDbUser.fullName,
          email: existingDbUser.email,
          role: existingDbUser.profile?.role ?? 'member',
        },
      },
      { status: 409 }
    );
  }

  const supabase = getSupabaseAdmin();
  const tempPassword = `WfAP!${randomUUID()}`;

  let authUserId: string | null = null;
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (!error && data.user?.id) {
      authUserId = data.user.id;
    } else if (error?.message?.includes('already') || error?.code === 'user_already_exists') {
      authUserId = await findAuthUserIdByEmail(email);
      if (!authUserId) {
        return NextResponse.json({ error: 'This email already exists in auth, but could not be linked.' }, { status: 409 });
      }
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } catch (error) {
    console.error('[admin/users POST] create auth user failed', error);
    return NextResponse.json({ error: 'Failed to create auth user.' }, { status: 500 });
  }

  if (!authUserId) {
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
  }

  try {
    const organizationId = await getDefaultOrganizationId();
    const created = await prisma.$transaction(async (tx) => {
      const user = await ensureAppUser(tx, {
        authUserId,
        organizationId,
        email,
        fullName,
      });

      const profile = await ensureProfileRole(tx, authUserId, role);
      await syncManagedUserRoles(tx, authUserId, role);

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: profile.role,
      };
    });

    if (sendResetEmail) {
      const { error } = await sendPasswordResetEmail(email);
      if (error) {
        return NextResponse.json({
          success: true,
          user: created,
          warning: `User created, but reset email failed: ${error.message}`,
        });
      }
    }

    return NextResponse.json({ success: true, user: created });
  } catch (error) {
    console.error('[admin/users POST] database setup failed', error);
    return NextResponse.json({ error: 'Failed to finish provisioning the new user.' }, { status: 500 });
  }
}
