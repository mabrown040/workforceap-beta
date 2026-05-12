/**
 * Durable task queue for autonomous agent swarms.
 * Used by night-shift cron, self-healing retries, and morning digest.
 */
import { prisma } from '../db/prisma';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked';

export interface AgentTask {
  id: number;
  task: string;
  priority: number;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  assignedAgent: string | null;
  result: string | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Enqueue a task for overnight or autonomous execution.
 */
export async function enqueueTask(
  task: string,
  priority = 0,
  maxRetries = 2
): Promise<AgentTask> {
  const row = await prisma.$queryRawUnsafe<AgentTask[]>(
    `INSERT INTO agent_tasks (task, priority, max_retries, status, retries)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING *`,
    task,
    priority,
    maxRetries
  );
  return row[0];
}

/**
 * Claim the highest-priority pending task.
 */
export async function claimNextTask(agentId: string): Promise<AgentTask | null> {
  const rows = await prisma.$queryRawUnsafe<AgentTask[]>(
    `UPDATE agent_tasks
     SET status = 'running', assigned_agent = $1, started_at = NOW()
     WHERE id = (
       SELECT id FROM agent_tasks
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT 1
     )
     RETURNING *`,
    agentId
  );
  return rows[0] ?? null;
}

/**
 * Mark a task complete with result.
 */
export async function completeTask(taskId: number, result: string): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE agent_tasks
     SET status = 'done', result = $1, completed_at = NOW()
     WHERE id = $2`,
    result,
    taskId
  );
}

/**
 * Mark a task failed. If retries remain, requeue it.
 */
export async function failTask(taskId: number, error: string): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE agent_tasks
     SET status = CASE
       WHEN retries < max_retries THEN 'pending'
       ELSE 'failed'
     END,
     error = $1,
     retries = retries + 1,
     assigned_agent = NULL,
     completed_at = CASE WHEN retries >= max_retries THEN NOW() ELSE NULL END
     WHERE id = $2`,
    error,
    taskId
  );
}

/**
 * Mark a task blocked (needs human intervention).
 */
export async function blockTask(taskId: number, reason: string): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE agent_tasks
     SET status = 'blocked', error = $1, completed_at = NOW()
     WHERE id = $2`,
    reason,
    taskId
  );
}

/**
 * Get summary of tasks in a time window (for morning digest).
 */
export async function getTaskSummary(since: Date): Promise<{
  done: number;
  failed: number;
  blocked: number;
  pending: number;
  items: { status: TaskStatus; task: string; error: string | null }[];
}> {
  const rows = await prisma.$queryRawUnsafe<
    { status: TaskStatus; task: string; error: string | null }[]
  >(
    `SELECT status, task, error
     FROM agent_tasks
     WHERE created_at >= $1
     ORDER BY priority DESC, created_at ASC`,
    since
  );
  return {
    done: rows.filter((r: { status: TaskStatus }) => r.status === 'done').length,
    failed: rows.filter((r: { status: TaskStatus }) => r.status === 'failed').length,
    blocked: rows.filter((r: { status: TaskStatus }) => r.status === 'blocked').length,
    pending: rows.filter((r: { status: TaskStatus }) => r.status === 'pending').length,
    items: rows,
  };
}
