import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { buildCronsWhere } from '../_cronsQuery';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      jobName: searchParams.get('jobName') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: 1,
      pageSize: 10_000,
    };

    const where = buildCronsWhere(params);
    const executions = await prisma.cronExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 10_000,
    });

    const csv = dataToCsv(
      [
        { key: 'id', header: 'ID', accessor: (r) => r.id },
        { key: 'jobName', header: 'Job Name', accessor: (r) => r.jobName },
        { key: 'status', header: 'Status', accessor: (r) => r.status },
        { key: 'startedAt', header: 'Started', accessor: (r) => r.startedAt },
        { key: 'completedAt', header: 'Completed', accessor: (r) => r.completedAt },
        { key: 'durationMs', header: 'Duration (ms)', accessor: (r) => r.durationMs ?? '' },
        { key: 'recordsProcessed', header: 'Records Processed', accessor: (r) => r.recordsProcessed ?? '' },
        { key: 'errorMessage', header: 'Error', accessor: (r) => r.errorMessage ?? '' },
      ],
      executions,
      { reportTitle: 'Cron Execution Export', notes: 'Workforce Advancement Project' },
    );

    return csvDownloadResponse(csv, exportFilename('crons'), { truncated: executions.length >= 10_000, limit: 10_000 });
  } catch (error) {
    console.error('[admin/crons/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
