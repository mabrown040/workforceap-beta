import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { fetchCrons, type CronsQueryParams } from './_cronsQuery';

export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: CronsQueryParams = {
      jobName: searchParams.get('jobName') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
      pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10))),
    };

    const result = await fetchCrons(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/crons] Error:', error);
    return NextResponse.json({ error: 'Failed to load cron executions' }, { status: 500 });
  }
});
