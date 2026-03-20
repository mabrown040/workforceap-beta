import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/** List users for admin dropdowns (e.g. subgroup leader selection). Returns id, fullName, email. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' },
  });
  return NextResponse.json(users);
}
