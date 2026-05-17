import { NextResponse } from 'next/server';

import { buildFunderProgramSummaryCsv } from '@/lib/admin/funderProgramSummaryCsv';
import { getFunderProgramSummaryRows } from '@/lib/admin/funderProgramMetrics';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getActorOrganizationId } from '@/lib/tenant/organization';

/**
 * GET /api/admin/funder-program-summary
 *
 * Program-level CSV for grant / funder reporting (enrollment, 30-day activity,
 * training completion, placements, at-risk alerts, rates).
 */
export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      const orgId = await getActorOrganizationId(user.id);
      const { rows, truncated } = await getFunderProgramSummaryRows(orgId);
      const csv = buildFunderProgramSummaryCsv(rows);

      const date = new Date().toISOString().slice(0, 10);
      const filename = `funder-program-summary-${date}.csv`;

      const headers: Record<string, string> = {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      };
      if (truncated) {
        headers['X-Export-Truncated'] = 'true';
        headers['X-Export-Limit'] = '10000';
      }

      return new NextResponse(csv, { status: 200, headers });
    } catch (e) {
      console.error('[admin/funder-program-summary]', e);
      return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('/admin/funder-program-summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
