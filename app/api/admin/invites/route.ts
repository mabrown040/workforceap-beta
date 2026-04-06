import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { checkAdminInviteRateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email';
import { InvitationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'all' | 'pending' | 'accepted' | 'expired'

  const where: { status?: InvitationStatus } = {};
  if (status && status !== 'all') {
    if (['pending', 'accepted', 'expired', 'revoked'].includes(status)) {
      where.status = status as InvitationStatus;
    }
  }

  const invites = await prisma.invitation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { id: true, fullName: true, email: true } },
      subgroup: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { success: rateOk } = await checkAdminInviteRateLimit(user.id);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 invites per hour. Try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const email = typeof o.email === 'string' ? o.email.toLowerCase().trim() : '';
  const role = typeof o.role === 'string' ? o.role : '';
  const subgroupId =
    typeof o.subgroupId === 'string' && /^[0-9a-f-]{36}$/i.test(o.subgroupId.trim())
      ? o.subgroupId.trim()
      : null;
  const programSlug = typeof o.programSlug === 'string' ? o.programSlug.trim() || null : null;
  const partnerId =
    typeof o.partnerId === 'string' && /^[0-9a-f-]{36}$/i.test(o.partnerId.trim())
      ? o.partnerId.trim()
      : null;
  const personalMessage =
    typeof o.personalMessage === 'string' ? o.personalMessage.trim() || null : null;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!['admin', 'partner', 'member', 'counselor'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be admin, partner, member, or counselor' },
      { status: 400 }
    );
  }

  const validRoles = ['admin', 'partner', 'member', 'counselor'] as const;
  const inviteRole = validRoles.includes(role as (typeof validRoles)[number])
    ? (role as (typeof validRoles)[number])
    : 'member';

  if (inviteRole === 'partner' && subgroupId) {
    const subgroup = await prisma.subgroup.findUnique({ where: { id: subgroupId } });
    if (!subgroup) {
      return NextResponse.json({ error: 'Invalid subgroup' }, { status: 400 });
    }
  }

  if (inviteRole === 'counselor' && partnerId) {
    const p = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!p) {
      return NextResponse.json({ error: 'Invalid partner' }, { status: 400 });
    }
  }

  if (inviteRole === 'member' && programSlug) {
    const program = getProgramBySlug(programSlug);
    if (!program) {
      return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
    }
  }

  const existingPending = await prisma.invitation.findFirst({
    where: { email, status: 'pending' },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email.' },
      { status: 400 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  const token = generateToken();

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role: inviteRole,
      subgroupId: inviteRole === 'partner' ? subgroupId : null,
      partnerId: inviteRole === 'counselor' ? partnerId : null,
      programSlug: inviteRole === 'member' ? programSlug : null,
      invitedById: user.id,
      token,
      status: 'pending',
      personalMessage,
      expiresAt,
    },
    include: {
      invitedBy: { select: { fullName: true } },
    },
  });

  const inviteUrl = `${SITE_URL}/invite?token=${token}`;
  const roleLabel =
    inviteRole === 'admin'
      ? 'Admin'
      : inviteRole === 'partner'
        ? 'Partner'
        : inviteRole === 'counselor'
          ? 'Counselor'
          : 'Student';

  const emailResult = await sendInvitationEmail({
    to: email,
    inviterName: invitation.invitedBy.fullName.trim() || 'A WorkforceAP admin',
    role: roleLabel,
    personalMessage,
    inviteUrl,
  });

  if (!emailResult.ok) {
    console.error('Invitation email failed:', emailResult.error);
    // Invitation row already exists — returning 200 so admins can copy the link instead of
    // hitting "pending invitation already exists" on retry (common when RESEND_API_KEY is unset).
    return NextResponse.json({
      ok: true,
      emailSent: false,
      inviteUrl,
      warning:
        emailResult.error === 'Email not configured'
          ? 'Invitation saved, but outbound email is not configured (set RESEND_API_KEY). Copy the link below to share manually.'
          : 'Invitation saved, but the email could not be sent. Copy the link below or use Resend from the list.',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    emailSent: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    },
  });
}
