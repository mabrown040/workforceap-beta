import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { ApplicationStatus } from '@prisma/client';

const statusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'NEEDS_INFO']),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const application = await prisma.application.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const previousStatus = application.status;

  await prisma.application.update({
    where: { id },
    data: { status, notes: notes ?? application.notes },
  });

  await auditLog({
    actorUserId: user.id,
    action: 'application_status_change',
    targetType: 'application',
    targetId: id,
    metadata: {
      previousStatus,
      newStatus: status,
      userId: application.userId,
      userEmail: application.user.email,
    },
  });

  return NextResponse.json({ success: true });
}
