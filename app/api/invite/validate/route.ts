import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { sanitizePublicPartnerLabel, sanitizePublicSubgroupLabel } from '@/lib/public/publicDataFilters';
import { normalizeLoginCode } from '@/lib/invitations/loginCode';
import { checkInviteAcceptRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    let token = searchParams.get('token');

    // Login-code path (9/2/26): `?code=XXXX-XXXX&email=…` resolves the pending
    // invitation for that email whose token starts with the code. The pair is
    // required; a code on its own is never enough. Rate limited per IP like
    // the accept endpoint so codes cannot be brute-forced.
    const code = normalizeLoginCode(searchParams.get('code'));
    const codeEmail = (searchParams.get('email') ?? '').trim().toLowerCase();
    let resolvedByCode = false;
    if (!token && (searchParams.get('code') || codeEmail)) {
      if (!code || !codeEmail) {
        return NextResponse.json(
          { valid: false, error: 'Enter the email address the invitation was sent to and your login code.' },
          { status: 400 },
        );
      }
      const { success } = await checkInviteAcceptRateLimit(getClientIpFromRequest(request));
      if (!success) {
        return NextResponse.json(
          { valid: false, error: 'Too many attempts. Please try again in an hour.' },
          { status: 429 },
        );
      }
      const match = await prisma.$transaction((tx) => tx.invitation.findFirst({
        where: { email: codeEmail, status: 'pending', token: { startsWith: code } },
        orderBy: { createdAt: 'desc' },
        select: { token: true },
      }));
      if (!match) {
        return NextResponse.json(
          { valid: false, error: 'No open invitation matches that email and login code. Check both, or ask your WorkforceAP contact to resend it.' },
          { status: 404 },
        );
      }
      token = match.token;
      resolvedByCode = true;
    }
  
    if (!token || token.length < 32) {
      return NextResponse.json({ valid: false, error: 'Invalid or missing token' }, { status: 400 });
    }
  
    try {
      const invitation = await prisma.$transaction((tx) => tx.invitation.findUnique({
        where: { token },
        include: {
          invitedBy: { select: { fullName: true } },
          subgroup: { select: { id: true, name: true } },
          partner: { select: { id: true, name: true } },
        },
      }));
  
      if (!invitation) {
        return NextResponse.json({ valid: false, error: 'Invitation not found' }, { status: 404 });
      }
  
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          { valid: false, error: invitation.status === 'accepted' ? 'Already accepted' : 'Invitation no longer valid' },
          { status: 400 }
        );
      }
  
      if (new Date() > invitation.expiresAt) {
        await prisma.$transaction((tx) => tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        }));
        return NextResponse.json({ valid: false, error: 'Invitation has expired' }, { status: 400 });
      }
  
      const roleLabel =
        invitation.role === 'admin'
          ? 'Admin'
          : invitation.role === 'partner'
            ? 'Partner'
            : invitation.role === 'counselor'
              ? 'Counselor'
              : 'Student';
  
      const programSlug = invitation.programSlug;
      const program = programSlug ? getProgramBySlug(programSlug) : null;
  
      return NextResponse.json({
        valid: true,
        // Only handed back when the caller proved email + code; the token is
        // what the accept step needs.
        ...(resolvedByCode ? { token } : {}),
        counselorAffiliation: invitation.counselorAffiliation ?? null,
        email: invitation.email,
        role: invitation.role,
        roleLabel,
        inviterName: invitation.invitedBy.fullName?.trim() || 'A WorkforceAP team member',
        subgroup: invitation.subgroup
          ? { id: invitation.subgroup.id, name: sanitizePublicSubgroupLabel(invitation.subgroup.name) ?? invitation.subgroup.name }
          : null,
        program: program ? { slug: program.slug, title: program.title } : null,
        partner: invitation.partner
          ? { id: invitation.partner.id, name: sanitizePublicPartnerLabel(invitation.partner.name) ?? invitation.partner.name }
          : null,
      });
    } catch (e) {
      console.error('[api/invite/validate]', e);
      return NextResponse.json(
        { valid: false, error: 'Could not load this invitation. Please try again in a moment.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('/invite/validate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
