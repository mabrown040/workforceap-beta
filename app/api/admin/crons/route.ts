import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export interface CronsQueryParams {
  jobName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export function buildCronsWhere(params: CronsQueryParams): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (params.jobName) {
    where.jobName = { contains: params.jobName, mode: 'insensitive' };
  }
  if (params.status) {
    where.status = params.status;
  }
  if (params.dateFrom || params.dateTo) {
    where.startedAt = {};
    if (params.dateFrom) {
      (where.startedAt as Record<string, unknown>).gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      (where.startedAt as Record<string, unknown>).lte = new Date(params.dateTo);
    }
  }
  return where;
}

export async function fetchCrons(params: CronsQueryParams) {
  const where = buildCronsWhere(params);
  const [executions, total] = await Promise.all([
    prisma.cronExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.cronExecution.count({ where }),
  ]);

  return {
    executions,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}export const GET = withApiGuc(async (request: NextRequest) => {
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
