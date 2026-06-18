import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { syncOccupation, syncTopMappedOccupations } from '@/lib/onet/sync';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

const MAX_ONET_CODES = 50;

const bodySchema = z.object({
  onetCodes: z.array(z.string().min(1)).max(MAX_ONET_CODES).optional(),
  allMapped: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { onetCodes, allMapped } = parsed.data;

  if (allMapped) {
    const { synced, errors } = await syncTopMappedOccupations();
    void auditLog({ actorUserId: user.id, action: 'admin_onet_sync', targetType: 'User', targetId: user.id, metadata: { allMapped: true } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'OnetSync', id: user.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({ ok: true, synced, errors });
  }

  if (onetCodes?.length) {
    const errors: string[] = [];
    let ok = 0;
    for (const code of onetCodes) {
      const r = await syncOccupation(code);
      if (r.ok) ok++;
      else if (r.error) errors.push(`${code}: ${r.error}`);
    }
    void auditLog({ actorUserId: user.id, action: 'admin_onet_sync', targetType: 'User', targetId: user.id, metadata: { onetCodes: true } }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'OnetSync', id: user.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({ ok: true, synced: ok, errors });
  }

  return NextResponse.json({ error: 'Provide onetCodes or allMapped: true' }, { status: 400 });

  } catch (error) {
    console.error('/admin/onet/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

