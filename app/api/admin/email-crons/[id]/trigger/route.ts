import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
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
    await prisma.$transaction((tx) => tx.workflowDiagnostic.create({
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
    }));
  
    await auditLog({
      actorUserId: user.id,
      action: 'email_cron_manual_trigger',
      targetType: 'email_cron',
      targetId: id,
      metadata: { workflow: cron.workflowKey, ok, durationMs, error: errorMsg },
    });

    const orgId = await getActorOrganizationId(user.id);
    const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: user.id, role: actorRole },
      verb: 'launched',
      object: { type: 'EmailCron', id },
      orgId,
      request: auditRequestMeta(_req),
    });

    if (!ok) {
      return NextResponse.json({ ok: false, error: errorMsg, result }, { status: 200 });
    }

    return NextResponse.json({ ok: true, result, durationMs });
  } catch (error) {
    console.error('/admin/email-crons/[id]/trigger:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
