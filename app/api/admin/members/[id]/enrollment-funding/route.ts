import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { FundingSource } from '@prisma/client';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const bodySchema = z.object({
  fundingSource: z.nativeEnum(FundingSource).optional().nullable(),
  fundingNotes: z.string().max(8000).optional().nullable(),
  workspaceEmail: z.string().email().max(320).optional().nullable(),
  workspaceEmailProvisioned: z.boolean().optional(),
});

type Props = { params: Promise<{ id: string }> };export const POST = withApiGuc(async (request: NextRequest, { params }: Props) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.$transaction((tx) => tx.user.findFirst({ where: { id: memberId, deletedAt: null , organizationId: orgId },
    select: { id: true },
  }));
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const d = parsed.data;

  // Multi-program: funding/workspace metadata lives on the primary
  // enrollment row only. If a user has multiple enrollments, the secondary
  // ones don't get their own funding source through this UI.
  const enrollment = await prisma.$transaction((tx) => tx.courseEnrollment.findFirst({
    where: { userId: memberId, isPrimary: true },
    select: { id: true },
  }));

  if (enrollment) {
    await prisma.$transaction((tx) => tx.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        fundingSource: d.fundingSource ?? null,
        fundingNotes: d.fundingNotes ?? null,
        workspaceEmail: d.workspaceEmail ?? null,
        workspaceEmailProvisioned: d.workspaceEmailProvisioned ?? false,
      },
    }));
  }

  // Always sync workspaceEmail + provisioned flag to User
  await prisma.$transaction((tx) => tx.user.update({
    where: { id: memberId },
    data: {
      workspaceEmail: d.workspaceEmail ?? null,
      workspaceEmailProvisioned: d.workspaceEmailProvisioned ?? false,
    },
  }));

  auditLog({
    actorUserId: user.id,
    action: 'admin_enrollment_funding_update',
    targetType: 'User',
    targetId: memberId,
    metadata: { fundingSource: d.fundingSource ?? null, workspaceEmailProvisioned: d.workspaceEmailProvisioned ?? false, orgId },
  }).catch((err) => console.error('[audit] admin_enrollment_funding_update:', err));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/enrollment-funding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
