import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';

/**
 * POST /api/admin/email-crons/activate-all
 *
 * Writes an "enabled: true" toggle record for every registered cron so the
 * admin console and cron soft-guards treat all jobs as active.
 */
export async function POST() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const toggledAt = new Date().toISOString();
  const records = CRON_REGISTRY.map((cron) => ({
    workflow: cron.workflowKey,
    status: 'inspection' as const,
    actorUserId: user.id,
    method: 'admin_activate_all',
    summary: 'Cron enabled by launch activation',
    metadata: {
      enabled: true,
      toggledBy: user.id,
      toggledAt,
      reason: 'launch_activation',
    },
  }));

  await prisma.workflowDiagnostic.createMany({ data: records });

  return NextResponse.json({
    ok: true,
    activated: records.length,
    workflows: CRON_REGISTRY.map((c) => c.workflowKey),
  });

  } catch (error) {
    console.error('/admin/email-crons/activate-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

