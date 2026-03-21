import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

/** List members for admin (e.g. subgroup add-member search). Supports ?q= for search, ?limit= for max results. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 100);

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const members = await prisma.user.findMany({
    where,
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' },
    take: limit,
  });

  return NextResponse.json(members);
}
