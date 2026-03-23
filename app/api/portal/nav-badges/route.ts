import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getNavBadgeCountsForUser, isValidPortalBadgeRole } from '@/lib/portal/navBadges';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roleParam = request.nextUrl.searchParams.get('role') ?? 'member';
  if (!isValidPortalBadgeRole(roleParam)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const counts = await getNavBadgeCountsForUser(roleParam, user.id);
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
