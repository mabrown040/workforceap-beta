import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { trackEvent } from '@/lib/events/track';

/**
 * Walk-in session API — creates a brand-new member and starts an in-office
 * session. Counselor or admin (or super admin) only.
 *
 * Difference from /api/admin/members/create:
 *   - leaner intake: only firstName + email required (other intake fields
 *     are filled in during the session via the Profile step)
 *   - does NOT enroll in a program (that's a session step too)
 *   - assigns the calling counselor as the member's counselor (admins skip
 *     this — admins don't take member assignments)
 *   - returns the new memberId + a fresh sessionId for the run page
 */
const walkInSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional().default(''),
  targetRole: z.string().max(200).optional().default(''),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [counselorRole, adminRole, superAdminRole] = await Promise.all([
    isCounselor(user.id),
    isAdmin(user.id),
    isSuperAdmin(user.id),
  ]);
  if (!counselorRole && !adminRole && !superAdminRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = walkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { firstName, lastName, email: emailRaw, phone, targetRole } = parsed.data;
  const email = emailRaw.toLowerCase().trim();
  const fullName = `${firstName} ${lastName}`.trim() || firstName;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

  const supabase = getSupabaseAdmin();

  // Invite first (sends a welcome / set-password email). Falls back to
  // createUser + reset-link if invite isn't available in this Supabase setup.
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/dashboard`,
    data: { full_name: fullName, phone, walked_in_by: user.id },
  });

  let authUser: { id: string; email?: string } | null = null;
  if (!inviteError && inviteData.user) {
    authUser = inviteData.user;
  } else if (inviteError?.message?.includes('already') || inviteError?.code === 'user_already_exists') {
    return NextResponse.json(
      {
        error:
          'A member with this email already exists. Use the existing-member path from the In-office sessions index.',
      },
      { status: 409 }
    );
  } else {
    const tempPassword = `WfAP${Date.now().toString(36)}!`;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, walked_in_by: user.id },
    });
    if (createError) {
      if (createError.message.includes('already')) {
        return NextResponse.json(
          { error: 'A member with this email already exists.' },
          { status: 409 }
        );
      }
      console.error('[walk-in] supabase create error', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    authUser = createData.user;
  }

  if (!authUser) {
    return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
  }

  const organizationId = await getDefaultOrganizationId();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: authUser.id,
          organizationId,
          email: authUser.email!,
          fullName,
          phone: phone || null,
        },
      });
      await tx.profile.create({
        data: {
          userId: authUser.id,
        },
      });

      // Counselor (not admin) → assign self to the new member so the
      // resolveActOnBehalf check passes when the run page POSTs AI tools.
      if (counselorRole && !adminRole && !superAdminRole) {
        const counselor = await tx.counselor.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (counselor) {
          await tx.counselorAssignment.create({
            data: {
              counselorId: counselor.id,
              memberId: authUser.id,
              active: true,
              notes: targetRole ? `Walk-in session, target role: ${targetRole}` : 'Walk-in session',
            },
          });
        }
      }
    });
  } catch (err) {
    console.error('[walk-in] db transaction failed', err);
    // Best-effort cleanup: remove the supabase auth user since we couldn't
    // finish provisioning. Otherwise the email is taken but no User row exists.
    try {
      await supabase.auth.admin.deleteUser(authUser.id);
    } catch {
      /* swallow — manual cleanup will be needed */
    }
    return NextResponse.json({ error: 'Failed to provision member account' }, { status: 500 });
  }

  const sessionId = randomUUID();

  // Audit/analytics: who created whom, in what session.
  trackEvent({
    userId: authUser.id,
    eventName: 'apply_signup_completed',
    entityType: 'user',
    entityId: authUser.id,
    metadata: {
      via: 'walk-in-session',
      actorUserId: user.id,
      targetRole: targetRole || null,
    },
    sessionId,
  }).catch(() => {});

  return NextResponse.json({
    memberId: authUser.id,
    sessionId,
    fullName,
    email: authUser.email,
  });
}
