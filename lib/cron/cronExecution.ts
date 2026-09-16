import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '@/lib/db/prisma';

export type CronStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

type CronExecutionContext = {
  executionId: string;
  /**
   * Set once a WorkflowDiagnostic row has been written for this execution, by
   * whichever layer got there first. 28 of the 29 cron routes call
   * `logCronRun` inside their own handler; `withCronLogging` consults this so
   * its fallback row does not duplicate theirs.
   */
  diagnosticLogged: boolean;
  recordsProcessed?: number;
};

const cronExecutionStorage = new AsyncLocalStorage<CronExecutionContext>();

export async function startCronExecution(jobName: string): Promise<string> {
  const execution = await prisma.cronExecution.create({
    data: {
      jobName,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
  return execution.id;
}

export async function setCronRecordsProcessed(count: number): Promise<void> {
  const ctx = cronExecutionStorage.getStore();
  if (!ctx) return;
  // Mirrored into the context so the wrapper's diagnostic row can carry the
  // same count the admin dashboard reads off CronExecution, without a
  // second query.
  ctx.recordsProcessed = count;
  await prisma.cronExecution.update({
    where: { id: ctx.executionId },
    data: { recordsProcessed: count },
  });
}

export async function completeCronExecution(
  executionId: string,
  status: Extract<CronStatus, 'SUCCESS' | 'FAILED' | 'SKIPPED'>,
  errorMessage?: string,
): Promise<void> {
  const completedAt = new Date();
  const execution = await prisma.cronExecution.findUnique({
    where: { id: executionId },
    select: { startedAt: true },
  });
  const durationMs = execution?.startedAt
    ? completedAt.getTime() - execution.startedAt.getTime()
    : null;

  await prisma.cronExecution.update({
    where: { id: executionId },
    data: {
      status,
      completedAt,
      durationMs,
      errorMessage: errorMessage ?? null,
    },
  });
}

export function getCurrentCronExecutionId(): string | undefined {
  return cronExecutionStorage.getStore()?.executionId;
}

export function getCronRecordsProcessed(): number | undefined {
  return cronExecutionStorage.getStore()?.recordsProcessed;
}

/**
 * Record that this execution already has a WorkflowDiagnostic row. A no-op
 * outside a cron execution, so non-cron callers of `logCronRun` are unaffected.
 */
export function markCronDiagnosticLogged(): void {
  const ctx = cronExecutionStorage.getStore();
  if (ctx) ctx.diagnosticLogged = true;
}

export function hasCronDiagnosticBeenLogged(): boolean {
  return cronExecutionStorage.getStore()?.diagnosticLogged ?? false;
}

export function runWithCronExecution<T>(executionId: string, fn: () => Promise<T>): Promise<T> {
  return cronExecutionStorage.run({ executionId, diagnosticLogged: false }, fn);
}
