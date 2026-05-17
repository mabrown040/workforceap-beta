import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
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

  } catch (error) {
    console.error('/admin/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
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

  } catch (error) {
    console.error('/admin/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function PATCH(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = z.object({
    id: z.string().min(1),
    placedAt: z.string().datetime().optional(),
    salaryOffered: z.number().nonnegative().optional(),
    employerName: z.string().min(1).max(200).optional(),
    jobTitle: z.string().min(1).max(200).optional(),
    retentionStatus: z.enum(['active', 'left', 'unknown']).optional(),
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fields', issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const orgId = await getActorOrganizationId(user.id);

  // Verify placement belongs to admin's org before updating
  const existing = await withTenantScope(orgId, async (db) =>
    db.placementRecord.findUnique({ where: { id }, select: { id: true } })
  );
  if (!existing) {
    return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
  }

  const placement = await withTenantScope(orgId, async (db) =>
    db.placementRecord.update({ where: { id }, data: updates })
  );

  return NextResponse.json({ placement });

  } catch (error) {
    console.error('/admin/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


function daysSince(date: Date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}
