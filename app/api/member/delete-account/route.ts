import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
    try {
      // Soft-delete in app DB AND release the email from the unique
      // constraint so the user (or anyone) can sign up again with the
      // same address. See app/api/admin/members/[id]/delete/route.ts.
      const existing = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, deletedAt: true },
      });
      if (existing) {
        const now = new Date();
        const newEmail = existing.deletedAt
          ? existing.email
          : `deleted_${user.id}_${now.getTime()}_${existing.email}@deleted.invalid`.slice(0, 255);
        await prisma.user.update({
          where: { id: user.id },
          data: { deletedAt: now, email: newEmail },
        });
      }
  
      // Hard-delete from Supabase Auth so the user cannot log back in
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (error) {
        console.error('[delete-account] Supabase auth delete error:', error.message);
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 502 });
      }
  
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[delete-account] error:', err);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
  } catch (error) {
    console.error('/member/delete-account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
