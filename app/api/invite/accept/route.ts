import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendInvitationAcceptedEmail } from '@/lib/email';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { invitationRoleLabel, inviteAcceptLoginRedirect } from '@/lib/invitations/inviteRoleLabels';
import { checkInviteAcceptRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { Prisma } from '@prisma/client';

type InviteTx = Prisma.TransactionClient;

function profileRoleForInvitation(role: string): string {
  return role === 'member' ? 'member' : role === 'counselor' ? 'counselor' : role;
}

async function ensureProfileRow(
  tx: InviteTx,
  userId: string,
  data: {
    role: string;
    profilePhone?: string | null;
    consentTerms?: boolean;
    consentCommunications?: boolean;
  }
) {
  // Some deployed DBs are missing Prisma's non-PK unique indexes (for example
  // profiles.user_id), so avoid upsert({ where: { userId } }) here.
  const existing = await tx.profile.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return tx.profile.update({
      where: { id: existing.id },
      data: {
        role: data.role,
        profilePhone: data.profilePhone ?? undefined,
      },
    });
  }

  return tx.profile.create({
    data: {
      userId,
      role: data.role,
      profilePhone: data.profilePhone ?? undefined,
      consentTerms: data.consentTerms ?? false,
      consentCommunications: data.consentCommunications ?? false,
    },
  });
}

async function ensurePartnerUserLink(tx: InviteTx, userId: string, partnerId: string) {
  const existing = await tx.partnerUser.findFirst({
    where: { userId },
    select: { id: true, partnerId: true },
  });

  if (existing) {
    if (existing.partnerId !== partnerId) {
      await tx.partnerUser.update({
        where: { id: existing.id },
        data: { partnerId },
      });
    }
    return;
  }

  await tx.partnerUser.create({
    data: { partnerId, userId },
  });
}

async function ensureMemberSubgroupLink(
  tx: InviteTx,
  memberId: string,
  subgroupId: string,
  assignedBy: string
) {
  const existing = await tx.memberSubgroup.findFirst({
    where: { memberId, subgroupId },
    select: { id: true },
  });

  if (existing) return;

  await tx.memberSubgroup.create({
    data: {
      memberId,
      subgroupId,
      assignedBy,
      assignmentType: 'manual_admin',
    },
  });
}

async function findRoleByName(tx: InviteTx, name: string) {
  return tx.role.findFirst({ where: { name } });
}

async function ensureCounselorRow(tx: InviteTx, userId: string, partnerId: string | null) {
  const existing = await tx.counselor.findFirst({
    where: { userId },
    select: { id: true, partnerId: true, active: true },
  });

  if (existing) {
    if (existing.partnerId !== partnerId || !existing.active) {
      await tx.counselor.update({
        where: { id: existing.id },
        data: {
          partnerId,
          active: true,
        },
      });
    }
    return;
  }

  await tx.counselor.create({
    data: {
      userId,
      partnerId,
      active: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkInviteAcceptRateLimit(ip);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in an hour.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const token = typeof o.token === 'string' ? o.token.trim() : '';
  const fullName = typeof o.fullName === 'string' ? o.fullName.trim() : '';
  const phone = typeof o.phone === 'string' ? o.phone.trim() || null : null;
  const password = typeof o.password === 'string' ? o.password : '';

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Invalid or missing token' }, { status: 400 });
  }

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { token },
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
        subgroup: { select: { id: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: invitation.status === 'accepted' ? 'Already accepted' : 'Invitation no longer valid' },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Match admin invite storage (lowercased) and avoid an unnecessary user_roles/roles join:
    // accept flow does not read userRoles; a broken roles join would 500 both branches here.
    const inviteEmail = String(invitation.email).trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: { email: inviteEmail },
    });

    if (existingUser) {
      if (!fullName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      return acceptExistingUser(existingUser, invitation, fullName, request);
    }

    if (!fullName || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Name and password (min 8 chars) are required for new accounts' },
        { status: 400 }
      );
    }

    return createNewUserAndAccept(invitation, fullName, phone, password, request);
  } catch (e) {
    console.error('[api/invite/accept]', e);
    return NextResponse.json(
      { error: 'Something went wrong accepting this invitation. Please try again.' },
      { status: 500 }
    );
  }
}

async function acceptExistingUser(
  user: { id: string; fullName: string; email: string },
  invitation: {
    id: string;
    role: string;
    invitedById: string;
    subgroupId: string | null;
    partnerId: string | null;
    programSlug: string | null;
    invitedBy: { fullName: string; email: string };
  },
  fullName: string,
  _request: NextRequest
) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { fullName: fullName || user.fullName, deletedAt: null },
      });

      // Ensure the user has a profile row (may be missing for older/imported accounts)
      await ensureProfileRow(tx, user.id, {
        role: profileRoleForInvitation(invitation.role),
        consentTerms: false,
        consentCommunications: false,
      });

      if (invitation.role === 'admin') {
        const adminRole = await findRoleByName(tx, 'admin');
        if (adminRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
            create: { userId: user.id, roleId: adminRole.id },
            update: {},
          });
        }
      }

      if (invitation.role === 'partner' && invitation.subgroupId) {
        const partner = await tx.subgroup.findUnique({
          where: { id: invitation.subgroupId },
          select: { partnerId: true },
        });
        if (partner?.partnerId) {
          await ensurePartnerUserLink(tx, user.id, partner.partnerId);
        }
        await ensureMemberSubgroupLink(tx, user.id, invitation.subgroupId, invitation.invitedById);
      }

      if (invitation.role === 'member' && invitation.programSlug) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            enrolledProgram: invitation.programSlug,
            enrolledAt: new Date(),
            programChangedAt: new Date(),
          },
        });
      }

      if (invitation.role === 'counselor') {
        const counselorRoleRow = await findRoleByName(tx, 'counselor');
        if (counselorRoleRow) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: counselorRoleRow.id } },
            create: { userId: user.id, roleId: counselorRoleRow.id },
            update: {},
          });
        }
        await ensureCounselorRow(tx, user.id, invitation.partnerId ?? null);
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedById: user.id,
        },
      });
    });
  } catch (dbError) {
    console.error('[acceptExistingUser] transaction failed:', dbError);
    return NextResponse.json(
      { error: 'Failed to update your account with the new role. Please try again.' },
      { status: 500 }
    );
  }

  const roleLabel = invitationRoleLabel(invitation.role);

  sendInvitationAcceptedEmail({
    to: invitation.invitedBy.email,
    accepterName: fullName || user.fullName,
    accepterEmail: user.email,
    role: roleLabel,
  }).catch((err) => console.error('Invitation accepted email failed:', err));

  return NextResponse.json({
    ok: true,
    message: 'Invitation accepted. You can now log in.',
    redirectTo: inviteAcceptLoginRedirect(invitation.role),
  });
}

async function createNewUserAndAccept(
  invitation: {
    id: string;
    email: string;
    role: string;
    invitedById: string;
    subgroupId: string | null;
    partnerId: string | null;
    programSlug: string | null;
    invitedBy: { fullName: string; email: string };
  },
  fullName: string,
  phone: string | null,
  password: string,
  request: NextRequest
) {
  const inviteEmail = String(invitation.email).trim().toLowerCase();

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error('[createNewUserAndAccept] Supabase admin client unavailable:', err);
    return NextResponse.json(
      {
        error:
          'Account signup is temporarily unavailable. If this continues, contact support.',
      },
      { status: 503 }
    );
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: inviteEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (authError) {
    if (authError.message.includes('already') || authError.code === 'user_already_exists') {
      // Check if a DB record exists for this email
      const existing = await prisma.user.findFirst({
        where: { email: inviteEmail },
      });
      if (existing) {
        return acceptExistingUser(existing, invitation, fullName, request);
      }
      // Orphaned Supabase auth user (previous attempt created auth but DB tx failed).
      // Look up the existing auth user and continue with DB record creation.
      const { data: userByEmail } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const orphanedAuthUser = userByEmail?.users?.find(
        (u) => u.email?.toLowerCase() === inviteEmail
      );
      if (orphanedAuthUser) {
        // Update password in case it changed between attempts
        if (password) {
          await supabase.auth.admin.updateUserById(orphanedAuthUser.id, { password });
        }
        return finishNewUserDbSetup(orphanedAuthUser.id, invitation, fullName, phone, request);
      }
    }
    return NextResponse.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  const authUser = authData.user;
  if (!authUser) {
    return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
  }

  return finishNewUserDbSetup(authUser.id, invitation, fullName, phone, request);
}

async function finishNewUserDbSetup(
  authUserId: string,
  invitation: {
    id: string;
    email: string;
    role: string;
    invitedById: string;
    subgroupId: string | null;
    partnerId: string | null;
    programSlug: string | null;
    invitedBy: { fullName: string; email: string };
  },
  fullName: string,
  phone: string | null,
  _request: NextRequest
) {
  let organizationId: string;
  try {
    organizationId = await getDefaultOrganizationId();
  } catch (err) {
    console.error('[finishNewUserDbSetup] default organization missing:', err);
    return NextResponse.json(
      {
        error:
          'Server configuration error: default organization is not set up. Please contact support.',
      },
      { status: 500 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      let memberRole = await findRoleByName(tx, 'member');
      if (!memberRole) {
        memberRole = await tx.role.create({ data: { name: 'member' } });
      }

      // Upsert user in case a previous attempt partially created the record
      await tx.user.upsert({
        where: { id: authUserId },
        create: {
          id: authUserId,
          organizationId,
          email: String(invitation.email).trim().toLowerCase(),
          fullName,
          phone,
          enrolledProgram: invitation.role === 'member' ? invitation.programSlug : null,
          enrolledAt: invitation.role === 'member' ? new Date() : null,
        },
        update: {
          fullName,
          phone,
          deletedAt: null,
          email: String(invitation.email).trim().toLowerCase(),
          enrolledProgram: invitation.role === 'member' ? invitation.programSlug : undefined,
          enrolledAt: invitation.role === 'member' ? new Date() : undefined,
        },
      });

      if (invitation.role !== 'counselor') {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: authUserId, roleId: memberRole.id } },
          create: { userId: authUserId, roleId: memberRole.id },
          update: {},
        });
      }

      await ensureProfileRow(tx, authUserId, {
        role: profileRoleForInvitation(invitation.role),
        profilePhone: phone,
      });

      if (invitation.role === 'admin') {
        const adminRole = await findRoleByName(tx, 'admin');
        if (adminRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: authUserId, roleId: adminRole.id } },
            create: { userId: authUserId, roleId: adminRole.id },
            update: {},
          });
        }
      }

      if (invitation.role === 'partner' && invitation.subgroupId) {
        const subgroup = await tx.subgroup.findUnique({
          where: { id: invitation.subgroupId },
          select: { partnerId: true },
        });
        if (subgroup?.partnerId) {
          await ensurePartnerUserLink(tx, authUserId, subgroup.partnerId);
        }
        await ensureMemberSubgroupLink(tx, authUserId, invitation.subgroupId, invitation.invitedById);
      }

      if (invitation.role === 'counselor') {
        const counselorRoleRow = await findRoleByName(tx, 'counselor');
        if (counselorRoleRow) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: authUserId, roleId: counselorRoleRow.id } },
            create: { userId: authUserId, roleId: counselorRoleRow.id },
            update: {},
          });
        }
        await ensureCounselorRow(tx, authUserId, invitation.partnerId ?? null);
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedById: authUserId,
        },
      });
    });
  } catch (dbError) {
    console.error('[finishNewUserDbSetup] transaction failed:', dbError);
    return NextResponse.json(
      { error: 'Failed to complete signup. Please try again.' },
      { status: 500 }
    );
  }

  const roleLabel = invitationRoleLabel(invitation.role);

  sendInvitationAcceptedEmail({
    to: invitation.invitedBy.email,
    accepterName: fullName,
    accepterEmail: invitation.email,
    role: roleLabel,
  }).catch((err) => console.error('Invitation accepted email failed:', err));

  return NextResponse.json({
    ok: true,
    message: 'Account created. You can now log in.',
    redirectTo: inviteAcceptLoginRedirect(invitation.role),
  });
}
