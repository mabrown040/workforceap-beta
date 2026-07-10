import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin, requireAdmin } from '@/lib/auth/roles';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditRequestMeta } from '@/lib/audit/log';
import { changeApplicationStatus } from '@/lib/admin/applicationReview';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const statusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'NEEDS_INFO']),
  notes: z.string().max(2000).optional(),
});

export const PATCH = withApiGuc(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkAuthRateLimit(`admin:${ip}`);
  if (!rateOk) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { status, notes } = parsed.data;
  const orgId = await getActorOrganizationId(user.id);
  const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';

  const result = await changeApplicationStatus({
    applicationId: id,
    status,
    notes,
    orgId,
    actorUserId: user.id,
    actorRole,
    requestMeta: auditRequestMeta(request),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ success: true });

  } catch (error) {
    console.error('/admin/members/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
