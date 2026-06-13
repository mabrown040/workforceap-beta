import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { auditLog } from '@/lib/audit';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  onetCode: z.string().min(1),
  programSlug: z.string().min(1),
  priority: z.number().int().min(1).max(99).default(1),
  experienceBand: z.enum(['beginner', 'some_experience', 'experienced']),
  recommendationType: z.enum(['primary', 'bridge', 'stretch']),
  whyRecommended: z.string().max(10000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Subset of CareerProgramMapping serialized into AuditLog metadata for
 * compliance / before-after comparisons. Stays small and stable on purpose.
 */
type MappingSnapshot = {
  id: string;
  onetCode: string;
  programSlug: string;
  priority: number;
  experienceBand: string;
  recommendationType: string;
  whyRecommended: string | null;
  isActive: boolean;
};

function snapshot(row: {
  id: string;
  onetCode: string;
  programSlug: string;
  priority: number;
  experienceBand: string;
  recommendationType: string;
  whyRecommended: string | null;
  isActive: boolean;
}): MappingSnapshot {
  return {
    id: row.id,
    onetCode: row.onetCode,
    programSlug: row.programSlug,
    priority: row.priority,
    experienceBand: row.experienceBand,
    recommendationType: row.recommendationType,
    whyRecommended: row.whyRecommended,
    isActive: row.isActive,
  };
}async function _GET(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onetCode = searchParams.get('onetCode')?.trim();
  const programSlug = searchParams.get('programSlug')?.trim();

  const rows = await prisma.$transaction((tx) => tx.careerProgramMapping.findMany({
    where: {
      ...(onetCode ? { onetCode } : {}),
      ...(programSlug ? { programSlug } : {}),
    },
    orderBy: [{ onetCode: 'asc' }, { experienceBand: 'asc' }, { priority: 'asc' }],
    take: 500,
  }));

  return NextResponse.json({ mappings: rows });

  } catch (error) {
    console.error('/admin/onet/mappings error:', error);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (!getProgramBySlug(data.programSlug)) {
    return NextResponse.json({ error: 'Unknown programSlug' }, { status: 400 });
  }

  if (data.id) {
    const row = await prisma.$transaction(async (tx) => {
      await tx.onetOccupation.upsert({
        where: { onetCode: data.onetCode },
        create: {
          onetCode: data.onetCode,
          title: data.onetCode,
          isActive: true,
        },
        update: {},
      });

      const before = await tx.careerProgramMapping.findUnique({ where: { id: data.id } });
      const updated = await tx.careerProgramMapping.update({
        where: { id: data.id },
        data: {
          onetCode: data.onetCode,
          programSlug: data.programSlug,
          priority: data.priority,
          experienceBand: data.experienceBand,
          recommendationType: data.recommendationType,
          whyRecommended: data.whyRecommended ?? null,
          isActive: data.isActive ?? true,
        },
      });

      // Pick the right action verb so a future versioned timeline reads naturally.
      let action = 'mapping_updated';
      if (before && before.isActive && !updated.isActive) action = 'mapping_deactivated';
      else if (before && !before.isActive && updated.isActive) action = 'mapping_reactivated';

      await auditLog({
        actorUserId: user.id,
        action,
        targetType: 'career_program_mapping',
        targetId: updated.id,
        metadata: {
          before: before ? snapshot(before) : null,
          after: snapshot(updated),
        },
      }, tx);

      return updated;
    });

    return NextResponse.json({ mapping: row });
  }

  const row = await prisma.$transaction(async (tx) => {
    await tx.onetOccupation.upsert({
      where: { onetCode: data.onetCode },
      create: {
        onetCode: data.onetCode,
        title: data.onetCode,
        isActive: true,
      },
      update: {},
    });

    const created = await tx.careerProgramMapping.create({
      data: {
        onetCode: data.onetCode,
        programSlug: data.programSlug,
        priority: data.priority,
        experienceBand: data.experienceBand,
        recommendationType: data.recommendationType,
        whyRecommended: data.whyRecommended ?? null,
        isActive: data.isActive ?? true,
      },
    });

    await auditLog({
      actorUserId: user.id,
      action: 'mapping_created',
      targetType: 'career_program_mapping',
      targetId: created.id,
      metadata: {
        before: null,
        after: snapshot(created),
      },
    }, tx);

    return created;
  });

  return NextResponse.json({ mapping: row });

  } catch (error) {
    console.error('/admin/onet/mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _DELETE(request: NextRequest) {
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

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const before = await tx.careerProgramMapping.findUnique({ where: { id: parsed.data.id } });
    if (!before) return false;

    await tx.careerProgramMapping.delete({ where: { id: parsed.data.id } });

    await auditLog({
      actorUserId: user.id,
      action: 'mapping_deleted',
      targetType: 'career_program_mapping',
      targetId: parsed.data.id,
      metadata: {
        before: snapshot(before),
        after: null,
      },
    }, tx);

    return true;
  });

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/onet/mappings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
