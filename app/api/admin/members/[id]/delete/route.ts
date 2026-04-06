import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await requireAdmin(user.id);

    const { id } = await params;

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) {
      console.error('[admin/members/[id]/delete] Supabase auth delete error:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/members/[id]/delete POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
