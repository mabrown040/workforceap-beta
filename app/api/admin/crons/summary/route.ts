import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { fetchCronSummary } from './_cronSummary';

export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await fetchCronSummary();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/crons/summary] Error:', error);
    return NextResponse.json({ error: 'Failed to load cron summary' }, { status: 500 });
  }
});
