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
  const personalMessage =
    typeof o.personalMessage === 'string' ? o.personalMessage.trim() || null : null;

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!['admin', 'partner', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be admin, partner, or member' }, { status: 400 });
  }

  const validRoles = ['admin', 'partner', 'member'] as const;
  const inviteRole = validRoles.includes(role as (typeof validRoles)[number])
    ? (role as (typeof validRoles)[number])
    : 'member';

  if (inviteRole === 'partner' && subgroupId) {
    const subgroup = await prisma.subgroup.findUnique({ where: { id: subgroupId } });
    if (!subgroup) {
      return NextResponse.json({ error: 'Invalid subgroup' }, { status: 400 });
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
  const roleLabel = inviteRole === 'admin' ? 'Admin' : inviteRole === 'partner' ? 'Partner' : 'Student';

  const emailResult = await sendInvitationEmail({
    to: email,
    inviterName: invitation.invitedBy.fullName.trim() || 'A WorkforceAP admin',
    role: roleLabel,
    personalMessage,
    inviteUrl,
  });

  if (!emailResult.ok) {
    console.error('Invitation email failed:', emailResult.error);
    return NextResponse.json(
      { error: 'Invitation created but email failed to send. You can resend from the invites list.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    },
  });
}
