import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope, counselorInOrg, assertSameTenant } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = await getActorOrganizationId(user.id);
  const rows = await withTenantScope(orgId, (db) =>
    db.counselor.findMany({
      take: 500,
      orderBy: [{ partner: { name: 'asc' } }, { user: { fullName: 'asc' } }],
      where: counselorInOrg(orgId),
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        partner: { select: { id: true, name: true } },
      },
    }),
  );

  return NextResponse.json({
    counselors: rows.map((c) => ({
      id: c.id,
      userId: c.userId,
      fullName: c.user.fullName,
      email: c.user.email,
      title: c.title,
      active: c.active,
      affiliation: c.affiliation,
      partnerId: c.partnerId,
      partnerName: c.partner?.name ?? null,
      // UI label: independent advisors display as "Advisor", others as "Counselor"
      label: c.affiliation === 'independent' ? 'advisor' : 'counselor',
    })),
  });

  } catch (error) {
    console.error('/admin/counselors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);


const createBody = z.object({
  userId: z.string().uuid(),
  partnerId: z.string().uuid().nullable().optional(),
  affiliation: z.enum(['wap_staff', 'partner', 'independent']).optional(),
  title: z.string().max(120).optional().nullable(),
});async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, partnerId, affiliation, title } = parsed.data;

  const orgId = await getActorOrganizationId(user.id);

  const existing = await withTenantScope(orgId, (db) =>
    db.counselor.findUnique({ where: { userId } }),
  );
  if (existing) {
    return NextResponse.json({ error: 'This user is already a counselor' }, { status: 400 });
  }

  const targetUser = await withTenantScope(orgId, (db) =>
    db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),
  );
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Resolve affiliation: default to wap_staff if not provided
  const resolvedAffiliation = affiliation ?? (partnerId ? 'partner' : 'wap_staff');

  // Validate partner linkage consistency
  if (resolvedAffiliation === 'partner' && !partnerId) {
    return NextResponse.json({ error: 'Partner affiliation requires a partnerId' }, { status: 400 });
  }
  if (resolvedAffiliation === 'wap_staff' && partnerId) {
    return NextResponse.json({ error: 'WAP staff cannot be linked to a partner org' }, { status: 400 });
  }
  if (resolvedAffiliation === 'independent' && partnerId) {
    return NextResponse.json({ error: 'Independent advisors cannot be linked to a partner org' }, { status: 400 });
  }

  if (partnerId) {
    await assertSameTenant('partner', partnerId, orgId);
    const p = await withTenantScope(orgId, (db) =>
      db.partner.findUnique({ where: { id: partnerId }, select: { id: true } }),
    );
    if (!p) return NextResponse.json({ error: 'Partner not found' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.counselor.create({
      data: {
        userId,
        partnerId: partnerId ?? null,
        affiliation: resolvedAffiliation,
        title: title?.trim() || null,
        active: true,
      },
    });
    await tx.profile.upsert({
      where: { userId },
      create: {
        userId,
        role: 'counselor',
        consentTerms: false,
        consentCommunications: false,
      },
      update: {
        role: 'counselor',
      },
    });
  });

  void auditLog({ actorUserId: user.id, action: 'admin_counselor_created', targetType: 'User', targetId: userId, metadata: { affiliation: resolvedAffiliation } }).catch(() => {});
  logAuditEvent({ user: { id: user.id, role: 'admin' }, verb: 'created', object: { type: 'Counselor', id: userId }, result: { success: true } }).catch(() => {});
  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/counselors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
