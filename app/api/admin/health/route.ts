import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Redis } from '@upstash/redis';
import { withApiGuc } from '@/lib/db/withRequestGuc';

export const dynamic = 'force-dynamic';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type SubsystemCheck = {
  status: 'ok' | 'degraded' | 'fail';
  latencyMs?: number;
  note?: string;
};

export type CronHealth = SubsystemCheck & {
  lastRun?: string;
  failures?: number;
};

export type WebhookHealth = SubsystemCheck & {
  pendingRetries?: number;
};

export type XapiHealth = SubsystemCheck & {
  pendingStatements?: number;
};

export type AIToolsHealth = SubsystemCheck & {
  queueDepth?: number;
};

export type EmailHealth = SubsystemCheck & {
  backlog?: number;
};

export type HealthChecks = {
  database: SubsystemCheck;
  redis: SubsystemCheck;
  prisma: SubsystemCheck;
  cronJobs: CronHealth;
  webhooks: WebhookHealth;
  xapi: XapiHealth;
  aiTools: AIToolsHealth;
  email: EmailHealth;
};

export type HealthResponse = {
  status: HealthStatus;
  checks: HealthChecks;
  generatedAt: string;
};

export type HealthHistoryPoint = {
  timestamp: string;
  status: HealthStatus;
};

export type HealthHistoryResponse = {
  history: HealthHistoryPoint[];
};

/* ─── Subsystem checkers ─── */

async function checkDatabase(): Promise<SubsystemCheck> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - started };
  } catch (err) {
    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      note: err instanceof Error ? err.message : 'Database unreachable',
    };
  }
}

async function checkRedis(): Promise<SubsystemCheck> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { status: 'ok', note: 'Redis not configured (optional)' };
  }

  const started = Date.now();
  try {
    const redis = new Redis({ url, token });
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - started };
  } catch (err) {
    return {
      status: 'fail',
      latencyMs: Date.now() - started,
      note: err instanceof Error ? err.message : 'Redis unreachable',
    };
  }
}

async function checkPrisma(): Promise<SubsystemCheck> {
  try {
    // Prisma exposes $connect / $disconnect, but the client is lazy.
    // A simple raw query proves the client is alive.
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'Prisma client unhealthy',
    };
  }
}

async function checkCronJobs(): Promise<CronHealth> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lastExecution, failuresLast24h] = await Promise.all([
      prisma.cronExecution.findFirst({
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, status: true, jobName: true },
      }),
      prisma.cronExecution.count({
        where: { status: 'FAILED', startedAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    const status: SubsystemCheck['status'] =
      failuresLast24h > 5 ? 'fail' : failuresLast24h > 0 ? 'degraded' : 'ok';

    return {
      status,
      lastRun: lastExecution?.startedAt?.toISOString() ?? undefined,
      failures: failuresLast24h,
      note: lastExecution
        ? `Last: ${lastExecution.jobName} (${lastExecution.status})`
        : 'No executions recorded',
    };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'Cron check failed',
    };
  }
}

async function checkWebhooks(): Promise<WebhookHealth> {
  try {
    const pendingRetries = await prisma.webhookEvent.count({
      where: { status: { in: ['retrying', 'failed'] } },
    });

    const status: SubsystemCheck['status'] =
      pendingRetries > 50 ? 'fail' : pendingRetries > 10 ? 'degraded' : 'ok';

    return {
      status,
      pendingRetries,
      note: pendingRetries > 0 ? `${pendingRetries} events need retry` : 'Queue clear',
    };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'Webhook check failed',
    };
  }
}

async function checkXapi(): Promise<XapiHealth> {
  try {
    const pendingStatements = await prisma.xapiStatement.count({
      where: { processed: false },
    });

    const status: SubsystemCheck['status'] =
      pendingStatements > 1000 ? 'fail' : pendingStatements > 500 ? 'degraded' : 'ok';

    return {
      status,
      pendingStatements,
      note:
        pendingStatements > 0
          ? `${pendingStatements} statements pending ingestion`
          : 'All statements processed',
    };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'xAPI check failed',
    };
  }
}

async function checkAiTools(): Promise<AIToolsHealth> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentCount, recentErrors] = await Promise.all([
      prisma.aIToolResult.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.workflowDiagnostic.count({
        where: {
          workflow: { startsWith: 'ai_' },
          status: { in: ['error', 'errored', 'failed'] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    // "queueDepth" here represents recent error volume vs. normal throughput.
    const status: SubsystemCheck['status'] =
      recentErrors > 20 ? 'fail' : recentErrors > 5 ? 'degraded' : 'ok';

    return {
      status,
      queueDepth: recentErrors,
      note: `${recentCount} runs in last 24h, ${recentErrors} errors`,
    };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'AI tools check failed',
    };
  }
}

async function checkEmail(): Promise<EmailHealth> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: 'degraded',
      backlog: 0,
      note: 'RESEND_API_KEY missing — outbound emails skipped',
    };
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count email-related cron failures as a proxy for email backlog
    const emailCronFailures = await prisma.workflowDiagnostic.count({
      where: {
        workflow: { contains: 'email', mode: 'insensitive' },
        status: { in: ['error', 'errored', 'failed'] },
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    const status: SubsystemCheck['status'] =
      emailCronFailures > 5 ? 'fail' : emailCronFailures > 0 ? 'degraded' : 'ok';

    return {
      status,
      backlog: emailCronFailures,
      note: emailCronFailures > 0 ? `${emailCronFailures} email cron failures (24h)` : 'Email flowing',
    };
  } catch (err) {
    return {
      status: 'fail',
      note: err instanceof Error ? err.message : 'Email check failed',
    };
  }
}

/* ─── Route handlers ─── */

async function _GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const startedAt = new Date();

    const [
      database,
      redis,
      prismaCheck,
      cronJobs,
      webhooks,
      xapi,
      aiTools,
      email,
    ] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkPrisma(),
      checkCronJobs(),
      checkWebhooks(),
      checkXapi(),
      checkAiTools(),
      checkEmail(),
    ]);

    const checks: HealthChecks = {
      database,
      redis,
      prisma: prismaCheck,
      cronJobs,
      webhooks,
      xapi,
      aiTools,
      email,
    };

    // Overall status: fail if any critical subsystem is fail; degraded if any is degraded.
    const values = Object.values(checks);
    let overall: HealthStatus = 'healthy';
    if (values.some((c) => c.status === 'fail')) {
      overall = 'unhealthy';
    } else if (values.some((c) => c.status === 'degraded')) {
      overall = 'degraded';
    }

    const body: HealthResponse = {
      status: overall,
      checks,
      generatedAt: startedAt.toISOString(),
    };

    return NextResponse.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('/api/admin/health error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
export const GET = withApiGuc(_GET);
