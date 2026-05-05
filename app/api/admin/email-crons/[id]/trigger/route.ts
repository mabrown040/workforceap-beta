import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/admin/email-crons/[id]/trigger
 *
 * Manually triggers a cron job by forwarding the request to its API path
 * with the CRON_SECRET header. Records result in WorkflowDiagnostic.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await requireAdmin(user.id); } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const cron = CRON_REGISTRY.find(c => c.id === id);
  if (!cron) return NextResponse.json({ error: 'Cron not found' }, { status: 404 });

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({
      error: 'CRON_SECRET not configured',
      fix: 'Add CRON_SECRET to Vercel environment variables (Production) and redeploy.',
    }, { status: 503 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.workforceap.org';
  const url = `${origin}${cron.apiPath}`;

  let result: Record<string, unknown> = {};
  let ok = false;
  let errorMsg: string | null = null;
  const startedAt = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-cron-secret': secret,
      'Authorization': `Bearer ${secret}`,
    };

    const res = await fetch(url, {
      method: cron.method,
      headers,
      // Add a 60-second timeout
      signal: AbortSignal.timeout(60_000),
    });

    result = await res.json().catch(() => ({}));
    ok = res.ok;
    if (!ok) errorMsg = (result.error as string) ?? `HTTP ${res.status}`;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : 'Request failed';
    ok = false;
  }

  const durationMs = Date.now() - startedAt;

  // Record in WorkflowDiagnostic for history
  await prisma.workflowDiagnostic.create({
    data: {
      workflow: cron.workflowKey,
      status: ok ? 'ok' : 'error',
      actorUserId: user.id,
      method: 'manual_trigger',
      summary: ok
        ? `Manual trigger: ${JSON.stringify(result).slice(0, 200)}`
        : `Manual trigger failed: ${errorMsg}`,
      failureReason: errorMsg ?? undefined,
      metadata: { ...result, durationMs, triggeredBy: user.id, manual: true },
    },
  });

  if (!ok) {
    return NextResponse.json({ ok: false, error: errorMsg, result }, { status: 200 });
  }

  return NextResponse.json({ ok: true, result, durationMs });
}
