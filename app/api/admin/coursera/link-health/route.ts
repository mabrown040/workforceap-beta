import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditCourseraLinkHealth } from '@/lib/coursera/linkHealth';

export const runtime = 'nodejs';

/**
 * GET /api/admin/coursera/link-health
 *
 * Coursera → portal link coverage: identity mappings, linked vs orphan
 * course/badge progress, unmatched xAPI events, and healable orphan counts.
 */
export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await auditCourseraLinkHealth();
    return NextResponse.json({ ok: true, health });
  } catch (error) {
    console.error('/api/admin/coursera/link-health error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
});
