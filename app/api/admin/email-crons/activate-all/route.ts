import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { auditLog } from '@/lib/audit';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async () => {
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

  await auditLog({
    actorUserId: user.id,
    action: 'email_cron_activate_all',
    targetType: 'email_cron',
    metadata: {
      count: records.length,
      workflows: CRON_REGISTRY.map((c) => c.workflowKey),
    },
  });

  return NextResponse.json({
    ok: true,
    activated: records.length,
    workflows: CRON_REGISTRY.map((c) => c.workflowKey),
  });

  } catch (error) {
    console.error('/admin/email-crons/activate-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

