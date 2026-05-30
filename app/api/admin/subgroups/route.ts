import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

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

  const subgroups = await prisma.subgroup.findMany({
    take: 500,
    where: tenantFilter,
    orderBy: { name: 'asc' },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });
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

  const { name, type, leaderId, partnerId, description } = parsed.data;
  const superAdmin = await isSuperAdmin(user.id);
  let actorOrgId: string | null = null;
  if (!superAdmin) {
    try {
      actorOrgId = await getActorOrganizationId(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (type === 'partner' && partnerId) {
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, active: true },
      select: { id: true, organizationId: true },
    });
    if (!partner) {
      return NextResponse.json({ error: 'Invalid or inactive partner' }, { status: 400 });
    }
    if (actorOrgId && partner.organizationId !== actorOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const leader = await prisma.user.findUnique({ where: { id: leaderId }, select: { id: true, organizationId: true } });
  if (!leader) {
    return NextResponse.json({ error: 'Leader user not found' }, { status: 400 });
  }
  if (actorOrgId && leader.organizationId !== actorOrgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subgroup = await prisma.subgroup.create({
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
  });
  return NextResponse.json(subgroup, { status: 201 });

  } catch (error) {
    console.error('/admin/subgroups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
