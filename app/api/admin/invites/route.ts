import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { checkAdminInviteRateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { InvitationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}async function _GET(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'all' | 'pending' | 'accepted' | 'expired'

  // Tenant scope: super-admins see all invites; tenant admins see only
  // invites issued by users in their org. Helper `invitationInOrg(orgId)`
  // exists in lib/admin but wasn't used here.
  const where: {
    status?: InvitationStatus;
    invitedBy?: { organizationId: string };
  } = {};
  if (status && status !== 'all') {
    if (['pending', 'accepted', 'expired', 'revoked'].includes(status)) {
      where.status = status as InvitationStatus;
    }
  }
  if (!(await isSuperAdmin(user.id))) {
    try {
      where.invitedBy = { organizationId: await getActorOrganizationId(user.id) };
    } catch {
      return NextResponse.json({ invites: [] });
    }
  }

  const invites = await prisma.$transaction((tx) => tx.invitation.findMany({
    where,
    take: 1000,
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { id: true, fullName: true, email: true } },
      subgroup: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
    },
  }));

  return NextResponse.json({ invites });

  } catch (error) {
    console.error('/admin/invites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormSubmission =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');
  const inviteFormUrl = new URL('/admin/invites/new', request.url);
  const inviteListUrl = new URL('/admin/invites?invite=sent', request.url);
  const respondError = (error: string, status: number) => {
    if (isFormSubmission) {
      const url = new URL(inviteFormUrl);
      url.searchParams.set('error', error);
      return NextResponse.redirect(url, { status: 303 });
    }
    return NextResponse.json({ error }, { status });
  };
  const respondSuccess = (payload: Record<string, unknown>) => {
    if (isFormSubmission) {
      return NextResponse.redirect(inviteListUrl, { status: 303 });
    }
    return NextResponse.json(payload);
  };

  const user = await getUser();
  if (!user) return respondError('Unauthorized', 401);
  if (!(await isAdmin(user.id)))
    return respondError('Forbidden', 403);

  const { success: rateOk } = await checkAdminInviteRateLimit(user.id);
  if (!rateOk) {
    return respondError('Rate limit exceeded. Max 10 invites per hour. Try again later.', 429);
  }

  let body: unknown;
  if (isFormSubmission) {
    const formData = await request.formData();
    body = {
      email: formData.get('email'),
      role: formData.get('role'),
      subgroupId: formData.get('subgroupId'),
      partnerId: formData.get('partnerId'),
      programSlug: formData.get('programSlug'),
      personalMessage: formData.get('personalMessage'),
    };
  } else {
    try {
      body = await request.json();
    } catch {
      return respondError('Invalid request body', 400);
    }
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
    return respondError('Email is required', 400);
  }
  if (!['admin', 'partner', 'member', 'counselor'].includes(role)) {
    return respondError('Invalid role. Must be admin, partner, member, or counselor', 400);
  }

  const validRoles = ['admin', 'partner', 'member', 'counselor'] as const;
  const inviteRole = validRoles.includes(role as (typeof validRoles)[number])
    ? (role as (typeof validRoles)[number])
    : 'member';

  // Tenant-scope FK lookups: a tenant admin must not be able to attach
  // an Org B subgroup or Org B partner to their own org's invite. Super-
  // admins bypass (cross-tenant ops). AUDIT §C-T8.
  const actorIsSuperAdmin = await isSuperAdmin(user.id);
  let actorOrgId: string | null = null;
  if (!actorIsSuperAdmin) {
    try {
      actorOrgId = await getActorOrganizationId(user.id);
    } catch {
      return respondError('Server configuration error: actor organization not found', 500);
    }
  }

  if (inviteRole === 'partner' && subgroupId) {
    const subgroup = await prisma.$transaction((tx) => tx.subgroup.findUnique({
      where: { id: subgroupId },
      include: { leader: { select: { organizationId: true } } },
    }));
    if (!subgroup) {
      return respondError('Invalid subgroup', 400);
    }
    if (!actorIsSuperAdmin && subgroup.leader?.organizationId !== actorOrgId) {
      return respondError('Invalid subgroup', 400);
    }
  }

  if (inviteRole === 'counselor' && partnerId) {
    const p = await prisma.$transaction((tx) => tx.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, organizationId: true },
    }));
    if (!p) {
      return respondError('Invalid partner', 400);
    }
    if (!actorIsSuperAdmin && p.organizationId !== actorOrgId) {
      return respondError('Invalid partner', 400);
    }
  }

  if (inviteRole === 'member' && programSlug) {
    const program = getProgramBySlug(programSlug);
    if (!program) {
      return respondError('Invalid program', 400);
    }
  }

  const existingPending = await prisma.$transaction((tx) => tx.invitation.findFirst({
    where: { email, status: 'pending' },
  }));
  if (existingPending) {
    return respondError('A pending invitation already exists for this email.', 400);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  const token = generateToken();

  const invitation = await prisma.$transaction((tx) => tx.invitation.create({
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
  }));

  const inviteUrl = `${SITE_URL}/invite?token=${token}`;
  const roleLabel =
    inviteRole === 'admin'
      ? 'Admin'
      : inviteRole === 'partner'
        ? 'Partner'
        : inviteRole === 'counselor'
          ? 'Counselor'
          : 'Student';

  const orgId = await getActorOrganizationId(user.id);
  const emailResult = await sendInvitationEmail({
    to: email,
    inviterName: invitation.invitedBy.fullName.trim() || 'A WorkforceAP admin',
    role: roleLabel,
    personalMessage,
    inviteUrl,
    orgId,
  });

  if (!emailResult.ok) {
    console.error('Invitation email failed:', emailResult.error);
    if (isFormSubmission) {
      const url = new URL(inviteListUrl);
      url.searchParams.set('invite', 'saved_no_email');
      return NextResponse.redirect(url, { status: 303 });
    }
    // Invitation row already exists — return 200 so admins can copy/share the link
    // instead of getting "pending invitation already exists" on retry.
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

  return respondSuccess({
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

  } catch (error) {
    console.error('/admin/invites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

