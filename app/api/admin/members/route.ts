import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import type { Prisma } from '@prisma/client';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/** List members for admin (e.g. subgroup add-member search). Supports ?q= for search, ?limit= for max results. */
async function _GET(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 100);

  const role = request.nextUrl.searchParams.get('role')?.trim() || 'member';

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    profile: { role },
  };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orgId = await getActorOrganizationId(user.id);
  const members = await withTenantScope(orgId, (db) =>
    db.user.findMany({
      where,
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
      take: limit,
    }),
  );

  return NextResponse.json(members);

  } catch (error) {
    console.error('/admin/members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
