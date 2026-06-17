import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';

const SUBGROUP_TYPES = ['partner', 'manager', 'church'] as const;

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(SUBGROUP_TYPES),
  leaderId: z.string().uuid(),
  partnerId: z.string().uuid().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Tenant scope: super-admins see all subgroups; tenant admins only see
  // subgroups whose LEADER belongs to their org (the canonical owner). A
  // helper `subgroupInOrg(orgId)` exists in lib/admin but isn't used here.
  let tenantFilter: object = {};
  if (!(await isSuperAdmin(user.id))) {
    try {
      tenantFilter = { leader: { organizationId: await getActorOrganizationId(user.id) } };
    } catch {
      return NextResponse.json([]);
    }
  }

  const subgroups = await prisma.$transaction((tx) => tx.subgroup.findMany({
    take: 500,
    where: tenantFilter,
    orderBy: { name: 'asc' },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  }));
  return NextResponse.json(subgroups);

  } catch (error) {
    console.error('/admin/subgroups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const orgId = await getActorOrganizationId(user.id);

  const { name, type, leaderId, partnerId, description } = parsed.data;

  // Hoisted: `await` can't live inside the non-async $transaction callbacks.
  const tenantFilter = (await isSuperAdmin(user.id)) ? {} : { organizationId: orgId };

  if (type === 'partner' && partnerId) {
    const partner = await prisma.$transaction((tx) => tx.partner.findFirst({
      where: { id: partnerId, active: true, ...tenantFilter },
    }));
    if (!partner) {
      return NextResponse.json({ error: 'Invalid, inactive, or cross-tenant partner' }, { status: 400 });
    }
  }

  const leader = await prisma.$transaction((tx) => tx.user.findFirst({
    where: {
      id: leaderId,
      ...tenantFilter,
    },
    select: { id: true },
  }));
  if (!leader) {
    return NextResponse.json({ error: 'Leader user not found or not in your organization' }, { status: 400 });
  }

  const subgroup = await prisma.$transaction((tx) => tx.subgroup.create({
    data: {
      name,
      type,
      leaderId,
      partnerId: type === 'partner' ? partnerId ?? null : null,
      description: description ?? null,
      createdBy: user.id,
    },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  }));
  await auditLog({
    actorUserId: user.id,
    action: 'subgroup_create',
    targetType: 'subgroup',
    targetId: subgroup.id,
    metadata: { name, type, leaderId, partnerId: partnerId ?? null, organizationId: orgId },
  });

  return NextResponse.json(subgroup, { status: 201 });

  } catch (error) {
    console.error('/admin/subgroups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

