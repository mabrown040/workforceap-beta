import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendPasswordResetEmail } from '@/lib/auth/passwordReset';

/**
 * POST /api/admin/members/[id]/reset-password
 *
 * Sends a password-reset email to the member via Supabase Auth.
 * Super-admin only.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(admin.id))) {
    return NextResponse.json({ error: 'Forbidden — super admin only' }, { status: 403 });
  }

  const { id } = await params;

  const member = await prisma.user.findUnique({
    where: { id },
    select: { email: true, fullName: true },
  });
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  try {
    const { error } = await sendPasswordResetEmail(member.email);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Password reset email sent to ${member.email}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send reset email';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
