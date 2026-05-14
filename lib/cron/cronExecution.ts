import { AsyncLocalStorage } from 'async_hooks';
import { prisma } from '@/lib/db/prisma';

export type CronStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

const cronExecutionStorage = new AsyncLocalStorage<{ executionId: string }>();

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

export function runWithCronExecution<T>(executionId: string, fn: () => Promise<T>): Promise<T> {
  return cronExecutionStorage.run({ executionId }, fn);
}
