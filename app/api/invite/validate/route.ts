import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token.length < 32) {
    return NextResponse.json({ valid: false, error: 'Invalid or missing token' }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      invitedBy: { select: { fullName: true } },
      subgroup: { select: { id: true, name: true } },
    },
  });

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
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'expired' },
    });
    return NextResponse.json({ valid: false, error: 'Invitation has expired' }, { status: 400 });
  }

  const roleLabel =
    invitation.role === 'admin' ? 'Admin' : invitation.role === 'partner' ? 'Partner' : 'Student';

  const programSlug = invitation.programSlug;
  const program = programSlug ? getProgramBySlug(programSlug) : null;

  return NextResponse.json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    roleLabel,
    inviterName: invitation.invitedBy.fullName,
    subgroup: invitation.subgroup
      ? { id: invitation.subgroup.id, name: invitation.subgroup.name }
      : null,
    program: program ? { slug: program.slug, title: program.title } : null,
  });
}
