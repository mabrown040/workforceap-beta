import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getBoardSnapshot, BoardOutcomesPeriod, formatBoardSnapshotMarkdown } from '@/lib/admin/boardOutcomes';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { logAuditEvent, auditRequestMeta } from '@/lib/audit/log';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = await getActorOrganizationId(user.id);

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') ?? 'all-time') as BoardOutcomesPeriod;
    const format = searchParams.get('format') ?? 'json';

    const snapshot = await getBoardSnapshot(period, orgId ?? undefined);

    // AUDIT: outcomes snapshot access
    await logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'viewed',
      object: { type: 'OutcomesSnapshot', id: period },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId: orgId ?? null,
    });

    if (format === 'csv') {
      const csv = dataToCsv(
        [
          { key: 'stage', header: 'Stage', accessor: (r) => r.stage },
          { key: 'count', header: 'Count', accessor: (r) => r.count },
          { key: 'previousCount', header: 'Previous Stage Count', accessor: (r) => r.previousCount ?? '' },
          { key: 'conversionRate', header: 'Conversion Rate', accessor: (r) => r.conversionRate != null ? `${r.conversionRate}%` : '' },
        ],
        snapshot.funnelWaterfall,
        { reportTitle: `WorkforceAP Outcomes — ${snapshot.outcomes.period.label}`, notes: `Generated ${snapshot.generatedAt.toISOString()}` },
      );
      return csvDownloadResponse(csv, exportFilename('outcomes-snapshot'));
    }

    if (format === 'md') {
      const md = formatBoardSnapshotMarkdown(snapshot);
      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${exportFilename('outcomes-snapshot', 'md')}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
