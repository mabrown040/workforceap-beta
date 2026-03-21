import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { id } });

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending invitations can be revoked.' },
      { status: 400 }
    );
  }

  await prisma.invitation.update({
    where: { id },
    data: { status: 'revoked' },
  });

  return NextResponse.json({ ok: true, message: 'Invitation revoked.' });
}
