import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const placements = await withTenantScope(orgId, async (db) =>
    db.placementRecord.findMany({
      orderBy: { placedAt: 'desc' },
      take: 500,
      include: {
        user: { select: { fullName: true, email: true, id: true } },
      },
    })
  );

  const enriched = placements.map((p) => ({
    ...p,
    survey30: p.placedAt ? daysSince(p.placedAt) >= 30 : false,
    survey60: p.placedAt ? daysSince(p.placedAt) >= 60 : false,
    survey90: p.placedAt ? daysSince(p.placedAt) >= 90 : false,
  }));

  return NextResponse.json({ placements: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, employerName, jobTitle, salaryOffered, placedAt } = body;
  if (!userId || !employerName || !jobTitle) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const placement = await withTenantScope(orgId, async (db) =>
    db.placementRecord.create({
      data: {
        userId,
        employerName,
        jobTitle,
        salaryOffered: salaryOffered ? parseInt(salaryOffered, 10) : null,
        placedAt: placedAt ? new Date(placedAt) : new Date(),
      },
    })
  );

  return NextResponse.json({ placement });
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const orgId = await getActorOrganizationId(user.id);
  const placement = await withTenantScope(orgId, async (db) =>
    db.placementRecord.update({ where: { id }, data: updates })
  );

  return NextResponse.json({ placement });
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}
