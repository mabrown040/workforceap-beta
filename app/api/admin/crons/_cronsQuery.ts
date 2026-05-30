import { prisma } from '@/lib/db/prisma';

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
}
