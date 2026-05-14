import { prisma } from '@/lib/db/prisma';
import {
  RETENTION_TABLES,
  RETENTION_BATCH_SIZE,
  DELETED_ACCOUNT_RETENTION_DAYS,
  getCutoffDate,
  type RetentionTableConfig,
} from './config';

export type CleanupResult = {
  model: string;
  deleted: number;
  batchCount: number;
  error?: string;
};

export type DataCleanupReport = {
  startedAt: string;
  completedAt: string;
  results: CleanupResult[];
  totalDeleted: number;
  deletedAccounts?: number;
};

/**
 * Delete rows older than the retention period in batches.
 *
 * Uses a simple loop because Prisma's `deleteMany` does not support
 * `limit`/`take` — we query a batch of IDs and then delete by ID.
 *
 * Never deletes member data directly; only log/telemetry tables
 * defined in RETENTION_TABLES.
 */
export async function cleanupTable(cfg: RetentionTableConfig): Promise<CleanupResult> {
  const cutoff = getCutoffDate(cfg.days);
  const delegate = (prisma as any)[cfg.model];
  if (!delegate || typeof delegate.findMany !== 'function') {
    throw new Error(`Invalid Prisma model: ${cfg.model}`);
  }

  let totalDeleted = 0;
  let batchCount = 0;

  while (true) {
    const rows: { id: string }[] = await delegate.findMany({
      where: { [cfg.dateColumn]: { lt: cutoff } },
      select: { id: true },
      take: RETENTION_BATCH_SIZE,
      orderBy: { [cfg.dateColumn]: 'asc' },
    });

    if (rows.length === 0) break;

    const ids = rows.map((r) => r.id);
    const deleteResult = await delegate.deleteMany({
      where: { id: { in: ids } },
    });

    totalDeleted += deleteResult.count ?? rows.length;
    batchCount += 1;

    if (rows.length < RETENTION_BATCH_SIZE) break;
  }

  return {
    model: cfg.model,
    deleted: totalDeleted,
    batchCount,
  };
}

/**
 * Hard-delete users that have been soft-deleted for longer than
 * DELETED_ACCOUNT_RETENTION_DAYS.
 *
 * This is a GDPR compliance measure: after the legal hold period,
 * the account and all cascading relations are permanently removed.
 */
export async function cleanupDeletedAccounts(): Promise<number> {
  const cutoff = getCutoffDate(DELETED_ACCOUNT_RETENTION_DAYS);

  let totalDeleted = 0;

  while (true) {
    const rows: { id: string }[] = await prisma.user.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true },
      take: RETENTION_BATCH_SIZE,
      orderBy: { deletedAt: 'asc' },
    });

    if (rows.length === 0) break;

    // deleteMany cascades via Prisma relations where configured
    const result = await prisma.user.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });

    totalDeleted += result.count;
    if (rows.length < RETENTION_BATCH_SIZE) break;
  }

  return totalDeleted;
}

/**
 * Run the full data cleanup sweep.
 *
 * Iterates every retention table and removes expired rows.
 * Errors for individual tables are captured and reported but do not
 * abort the entire sweep.
 */
export async function runDataCleanup(): Promise<DataCleanupReport> {
  const startedAt = new Date().toISOString();
  const results: CleanupResult[] = [];
  let totalDeleted = 0;

  for (const cfg of RETENTION_TABLES) {
    try {
      const result = await cleanupTable(cfg);
      results.push(result);
      totalDeleted += result.deleted;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[data-cleanup] Failed for ${cfg.model}:`, error);
      results.push({
        model: cfg.model,
        deleted: 0,
        batchCount: 0,
        error,
      });
    }
  }

  let deletedAccounts = 0;
  try {
    deletedAccounts = await cleanupDeletedAccounts();
    totalDeleted += deletedAccounts;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[data-cleanup] Failed for deleted accounts:', error);
    results.push({
      model: 'user (deleted accounts)',
      deleted: 0,
      batchCount: 0,
      error,
    });
  }

  const completedAt = new Date().toISOString();

  return {
    startedAt,
    completedAt,
    results,
    totalDeleted,
    deletedAccounts,
  };
}
