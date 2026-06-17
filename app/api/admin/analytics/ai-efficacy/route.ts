import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { analyzeAIEfficacy, type AIEfficacyReport } from '@/lib/analytics/aiToolEfficacy';

function parseDateRange(req: NextRequest): { start: Date; end: Date } {
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('startDate');
  const endParam = searchParams.get('endDate');

  const end = endParam ? new Date(endParam) : new Date();
  end.setHours(23, 59, 59, 999);

  const start = startParam
    ? new Date(startParam)
    : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  // Only zero-out time for computed defaults; leave parsed dates as-is
  // so timezone shifts don't push the displayed date back a day.
  if (!startParam) {
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

async function computeAIEfficacyPayload(orgId: string, start: Date, end: Date): Promise<AIEfficacyReport> {
  return analyzeAIEfficacy(orgId, { start, end });
}

async function _GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmin = await isSuperAdmin(user.id);
    const orgId = superAdmin ? null : await getActorOrganizationId(user.id).catch(() => null);
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
    }
    const { start, end } = parseDateRange(req);

    const cacheKey = ['admin-api-ai-efficacy-v1', orgId, start.toISOString(), end.toISOString()];

    const body = await unstable_cache(
      async () => computeAIEfficacyPayload(orgId, start, end),
      cacheKey,
      { revalidate: 3600 }, // 1 hour
    )();

    return NextResponse.json(body);
  } catch (error) {
    console.error('/admin/analytics/ai-efficacy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
