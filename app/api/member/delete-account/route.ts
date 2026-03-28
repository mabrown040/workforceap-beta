import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Soft-delete in app DB
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    // Hard-delete from Supabase Auth so the user cannot log back in
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('[delete-account] Supabase auth delete error:', error.message);
      // Don't surface Supabase errors to client — app DB deletion succeeded
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[delete-account] error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
