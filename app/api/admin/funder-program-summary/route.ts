import { NextRequest, NextResponse } from 'next/server';

import { buildFunderProgramSummaryCsv } from '@/lib/admin/funderProgramSummaryCsv';
import { getFunderProgramSummaryRows } from '@/lib/admin/funderProgramMetrics';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

/**
 * GET /api/admin/funder-program-summary
 *
 * Program-level CSV for grant / funder reporting (enrollment, 30-day activity,
 * training completion, placements, at-risk alerts, rates).
 */
export const GET = withApiGuc(async (req: NextRequest) => {
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

      // AUDIT §H-DEP4: federal-grant exports must leave an audit trail.
      auditLog({
        actorUserId: user.id,
        action: 'admin.export.funder_program_summary',
        targetType: 'FunderProgramSummaryExport',
        metadata: { orgId, rowCount: rows.length, truncated },
      }).catch((err) => console.error('[admin/funder-program-summary] audit log failed:', err));
      logAuditEvent({
        user: { id: user.id, role: 'admin' },
        verb: 'exported',
        object: { type: 'FunderProgramSummaryExport', id: 'aggregate' },
        result: { success: true, extensions: { orgId, rowCount: rows.length, truncated } },
        request: auditRequestMeta(req),
        orgId,
      }).catch((err) => console.error('[admin/funder-program-summary] xAPI audit log failed:', err));

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
