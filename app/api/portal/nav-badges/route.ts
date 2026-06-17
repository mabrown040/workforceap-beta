import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getNavBadgeCountsForUser, isValidPortalBadgeRole } from '@/lib/portal/navBadges';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const GET = withApiGuc(async function GET(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roleParam = request.nextUrl.searchParams.get('role') ?? 'member';
  if (!isValidPortalBadgeRole(roleParam)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const counts = await getNavBadgeCountsForUser(roleParam, user.id);
    return NextResponse.json(counts, {
      headers: {
        // Private per-user counts; short TTL reduces duplicate work when tab refetches.
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    });
  } catch {
    return NextResponse.json({}, { status: 200 });
  }

  } catch (error) {
    console.error('/portal/nav-badges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
