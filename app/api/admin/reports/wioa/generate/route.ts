import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { generateWioaReport, type WioaReport } from '@/lib/cron/wioa-report';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * In-memory store for the last generated WIOA report.
 * MVP — no DB table needed. Survives as long as the lambda is warm.
 */
let lastReport: WioaReport | null = null;

async function _POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const period =
      body.periodStart && body.periodEnd
        ? {
            start: new Date(String(body.periodStart)),
            end: new Date(String(body.periodEnd)),
          }
        : undefined;

    const report = await generateWioaReport(period);
    lastReport = report;

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('/api/admin/reports/wioa/generate POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', detail: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
export const POST = withApiGuc(_POST);

async function _GET() {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      report: lastReport,
      lastGeneratedAt: lastReport?.generatedAt ?? null,
    });
  } catch (error) {
    console.error('/api/admin/reports/wioa/generate GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
