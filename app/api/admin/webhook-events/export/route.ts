import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import type { Prisma } from '@prisma/client';

function buildWhere(
  q: string,
  source: string,
  status: string,
  dateFrom: string,
  dateTo: string,
): Prisma.WebhookEventWhereInput {
  const trimmed = q.trim();
  const base: Prisma.WebhookEventWhereInput = {
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };
  if (!trimmed) return base;
  return {
    AND: [
      base,
      {
        OR: [
          { source: { contains: trimmed, mode: 'insensitive' } },
          { eventType: { contains: trimmed, mode: 'insensitive' } },
          { eventId: { contains: trimmed, mode: 'insensitive' } },
          { errorMessage: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
    ],
  };
}

async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const source = (searchParams.get('source') ?? '').trim();
    const status = (searchParams.get('status') ?? '').trim();
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';

    const where = buildWhere(q, source, status, dateFrom, dateTo);

    const events = await prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    const csv = dataToCsv(
      [
        { key: 'id', header: 'ID', accessor: (r) => r.id },
        { key: 'source', header: 'Source', accessor: (r) => r.source },
        { key: 'eventType', header: 'Event Type', accessor: (r) => r.eventType ?? '' },
        { key: 'eventId', header: 'Event ID', accessor: (r) => r.eventId ?? '' },
        { key: 'status', header: 'Status', accessor: (r) => r.status },
        { key: 'httpStatusCode', header: 'HTTP Status', accessor: (r) => r.httpStatusCode ?? '' },
        { key: 'payloadSize', header: 'Payload Size (bytes)', accessor: (r) => r.payloadSize },
        { key: 'processingTimeMs', header: 'Processing Time (ms)', accessor: (r) => r.processingTimeMs ?? '' },
        { key: 'retryCount', header: 'Retry Count', accessor: (r) => r.retryCount },
        { key: 'errorMessage', header: 'Error', accessor: (r) => r.errorMessage ?? '' },
        { key: 'createdAt', header: 'Created', accessor: (r) => r.createdAt },
        { key: 'updatedAt', header: 'Updated', accessor: (r) => r.updatedAt },
      ],
      events,
      { reportTitle: 'Webhook Events Export', notes: 'Workforce Advancement Project' },
    );

    return csvDownloadResponse(csv, exportFilename('webhook-events'), { truncated: events.length >= 10_000, limit: 10_000 });
  } catch (error) {
    console.error('[admin/webhook-events/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
