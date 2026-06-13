import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { sanitizePublicPartnerLabel, sanitizePublicSubgroupLabel } from '@/lib/public/publicDataFilters';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
  
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
