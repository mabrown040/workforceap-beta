import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

/**
 * Inserts multiple draft jobs in one round-trip (avoids per-row create in bulk import).
 */
export async function insertEmployerJobsBatch(
  rows: Prisma.JobUncheckedCreateInput[]
): Promise<{ id: string; title: string; provider?: string }[]> {
  if (rows.length === 0) return [];
  const createdRows = await prisma.job.createManyAndReturn({ data: rows });
  return createdRows.map((job, i) => ({
    id: job.id,
    title: job.title,
    provider: rows[i]?.importProvider?.trim() || undefined,
  }));
}
