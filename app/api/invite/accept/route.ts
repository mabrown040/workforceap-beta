import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendInvitationAcceptedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
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

  const invitation = await prisma.invitation.findUnique({
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

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    include: { profile: true, userRoles: { include: { role: true } } },
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
}

async function acceptExistingUser(
  user: { id: string; fullName: string; email: string; profile: { role: string } | null; userRoles: { role: { name: string } }[] },
  invitation: { id: string; role: string; invitedById: string; subgroupId: string | null; programSlug: string | null; invitedBy: { fullName: string; email: string } },
  fullName: string,
  _request: NextRequest
) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { fullName: fullName || user.fullName },
    });

    if (invitation.role === 'admin') {
      const adminRole = await tx.role.findUnique({ where: { name: 'admin' } });
      if (adminRole) {
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
          create: { userId: user.id, roleId: adminRole.id },
          update: {},
        });
      }
      const profile = await tx.profile.findUnique({ where: { userId: user.id } });
      if (profile) {
        await tx.profile.update({
          where: { userId: user.id },
          data: { role: 'admin' },
        });
      }
    }

    if (invitation.role === 'partner' && invitation.subgroupId) {
      const partner = await tx.subgroup.findUnique({
        where: { id: invitation.subgroupId },
        select: { partnerId: true },
      });
      if (partner?.partnerId) {
        await tx.partnerUser.upsert({
          where: { userId: user.id },
          create: { partnerId: partner.partnerId, userId: user.id },
          update: {},
        });
      }
      await tx.memberSubgroup.upsert({
        where: {
          memberId_subgroupId: { memberId: user.id, subgroupId: invitation.subgroupId },
        },
        create: {
          memberId: user.id,
          subgroupId: invitation.subgroupId,
          assignedBy: invitation.invitedById,
          assignmentType: 'manual_admin',
        },
        update: {},
      });
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

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });
  });

  const roleLabel =
    invitation.role === 'admin' ? 'Admin' : invitation.role === 'partner' ? 'Partner' : 'Student';

  sendInvitationAcceptedEmail({
    to: invitation.invitedBy.email,
    accepterName: fullName || user.fullName,
    accepterEmail: user.email,
    role: roleLabel,
  }).catch((err) => console.error('Invitation accepted email failed:', err));

  return NextResponse.json({
    ok: true,
    message: 'Invitation accepted. You can now log in.',
    redirectTo: '/login?redirectTo=/dashboard',
  });
}

async function createNewUserAndAccept(
  invitation: {
    id: string;
    email: string;
    role: string;
    invitedById: string;
    subgroupId: string | null;
    programSlug: string | null;
    invitedBy: { fullName: string; email: string };
  },
  fullName: string,
  phone: string | null,
  password: string,
  request: NextRequest
) {
  const supabase = getSupabaseAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (authError) {
    if (authError.message.includes('already') || authError.code === 'user_already_exists') {
      const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
      if (existing) {
        return acceptExistingUser(
          {
            ...existing,
            profile: null,
            userRoles: [],
          } as Parameters<typeof acceptExistingUser>[0],
          invitation,
          fullName,
          request
        );
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

  try {
    await prisma.$transaction(async (tx) => {
      let memberRole = await tx.role.findUnique({ where: { name: 'member' } });
      if (!memberRole) {
        memberRole = await tx.role.create({ data: { name: 'member' } });
      }

      await tx.user.create({
        data: {
          id: authUser.id,
          email: invitation.email,
          fullName,
          phone,
          enrolledProgram: invitation.role === 'member' ? invitation.programSlug : null,
          enrolledAt: invitation.role === 'member' ? new Date() : null,
        },
      });

      await tx.userRole.create({
        data: { userId: authUser.id, roleId: memberRole.id },
      });

      await tx.profile.create({
        data: {
          userId: authUser.id,
          profilePhone: phone,
          role: invitation.role === 'member' ? 'member' : invitation.role,
        },
      });

      if (invitation.role === 'admin') {
        const adminRole = await tx.role.findUnique({ where: { name: 'admin' } });
        if (adminRole) {
          await tx.userRole.create({
            data: { userId: authUser.id, roleId: adminRole.id },
          });
        }
        await tx.profile.update({
          where: { userId: authUser.id },
          data: { role: 'admin' },
        });
      }

      if (invitation.role === 'partner' && invitation.subgroupId) {
        const subgroup = await tx.subgroup.findUnique({
          where: { id: invitation.subgroupId },
          select: { partnerId: true },
        });
        if (subgroup?.partnerId) {
          await tx.partnerUser.create({
            data: { partnerId: subgroup.partnerId, userId: authUser.id },
          });
        }
        await tx.memberSubgroup.create({
          data: {
            memberId: authUser.id,
            subgroupId: invitation.subgroupId,
            assignedBy: invitation.invitedById,
            assignmentType: 'manual_admin',
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedById: authUser.id,
        },
      });
    });
  } catch (dbError) {
    console.error('Accept invite DB error:', dbError);
    return NextResponse.json(
      { error: 'Failed to complete signup. Please try again.' },
      { status: 500 }
    );
  }

  const roleLabel =
    invitation.role === 'admin' ? 'Admin' : invitation.role === 'partner' ? 'Partner' : 'Student';

  sendInvitationAcceptedEmail({
    to: invitation.invitedBy.email,
    accepterName: fullName,
    accepterEmail: invitation.email,
    role: roleLabel,
  }).catch((err) => console.error('Invitation accepted email failed:', err));

  return NextResponse.json({
    ok: true,
    message: 'Account created. You can now log in.',
    redirectTo: '/login?redirectTo=/dashboard',
  });
}
