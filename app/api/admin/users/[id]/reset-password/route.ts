import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(admin.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    const { error } = await sendPasswordResetEmail(user.email);
    if (error) throw error;
    return NextResponse.json({ success: true, message: `Password reset email sent to ${user.email}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send password reset email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
