import type { Prisma } from '@prisma/client';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

/**
 * Inserts multiple draft jobs in one round-trip (avoids per-row create
 * in bulk import).
 *
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 1).
 * Migrated from raw `prisma.job.createManyAndReturn` to
 * `withTenantScope(orgId, ...)`. The proxy auto-injects
 * `organizationId` into every row. The caller now MUST pass `orgId`
 * explicitly — this catches the bug where the previous version
 * silently accepted whatever `organizationId` came in via `rows`.
 *
 * Surfaced by Codex review on PR #1041; addressed in this batch.
 */
export async function insertEmployerJobsBatch(
  orgId: string,
  rows: Omit<Prisma.JobUncheckedCreateInput, 'organizationId'>[],
): Promise<{ id: string; title: string; provider?: string }[]> {
  if (rows.length === 0) return [];

  // organizationId is auto-injected by withTenantScope; passing it in the
  // row data and having it mismatch would throw TenantScopeViolation.
  const createdRows = await withTenantScope(orgId, (db) =>
    db.job.createManyAndReturn({
      data: rows as Prisma.JobUncheckedCreateInput[],
    }),
  );

  return createdRows.map((job: { id: string; title: string }, i: number) => ({
    id: job.id,
    title: job.title,
    provider: rows[i]?.importProvider?.trim() || undefined,
  }));
}
