import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { CRON_REGISTRY } from '@/lib/admin/cronRegistry';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/admin/email-crons/[id]/toggle
 * Body: { enabled: boolean }
 *
 * Soft-enables or disables a cron by writing a WorkflowDiagnostic entry
 * with metadata.enabled = false. The GET /api/admin/email-crons endpoint
 * reads this to surface the enabled state.
 *
 * Note: This does NOT stop Vercel from calling the cron on schedule.
 * The cron route itself checks WorkflowDiagnostic for the enabled flag
 * before doing work. This is a soft guard, not a hard Vercel schedule change.
 */
export async function POST(
  req: NextRequest,
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

  let body: { enabled?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const enabled = body.enabled !== false;

  await prisma.workflowDiagnostic.create({
    data: {
      workflow: cron.workflowKey,
      status: 'inspection',
      actorUserId: user.id,
      method: 'admin_toggle',
      summary: `Cron ${enabled ? 'enabled' : 'disabled'} by admin`,
      metadata: { enabled, toggledBy: user.id, toggledAt: new Date().toISOString() },
    },
  });

  return NextResponse.json({ ok: true, id, enabled });
}
