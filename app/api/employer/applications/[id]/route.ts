import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { notifyAndRecordPlacement } from '@/lib/employer/applicationStatusEffects';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const updateSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected']),
  employerNotes: z.string().max(5000).optional(),
  interviewScheduledAt: z.string().datetime().optional().nullable(),
});export const PATCH = withApiGuc(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const superAdmin = await isSuperAdmin(user.id);
  const ctx = await getEmployerForUser(user.id, { isSuperAdminHint: superAdmin });
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify this application belongs to this employer
  const application = await prisma.$transaction((tx) => tx.jobPostingApplication.findFirst({
    where: { id, job: { employerId: ctx.employerId } },
    select: { id: true, status: true },
  }));
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
  }

  const updates: {
    status?: typeof parsed.data.status;
    employerNotes?: string;
    interviewScheduledAt?: Date | null;
    statusUpdatedAt?: Date;
  } = {};

  if (parsed.data.status) {
    updates.status = parsed.data.status;
    updates.statusUpdatedAt = new Date();
  }
  if (parsed.data.employerNotes !== undefined) {
    updates.employerNotes = parsed.data.employerNotes;
  }
  if (parsed.data.interviewScheduledAt !== undefined) {
    updates.interviewScheduledAt = parsed.data.interviewScheduledAt ? new Date(parsed.data.interviewScheduledAt) : null;
  }

  const updated = await prisma.$transaction((tx) => tx.jobPostingApplication.update({
    where: { id },
    data: updates,
  }));

  auditLog({
    actorUserId: user.id,
    action: 'employer_application_updated',
    targetType: 'User',
    targetId: updated.studentId,
    metadata: { applicationId: id, previousStatus: application.status, nextStatus: updated.status, employerId: ctx.employerId },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'employer' },
    verb: 'updated',
    object: { type: 'JobApplication', id },
    result: { success: true, extensions: { previousStatus: application.status, nextStatus: updated.status } },
  }).catch(() => {});

  if (updated.status !== application.status) {
    void notifyAndRecordPlacement({
      applicationId: id,
      studentId: updated.studentId,
      employerId: ctx.employerId,
      nextStatus: updated.status,
    });
  }

  return NextResponse.json({ ok: true, application: updated });

  } catch (error) {
    console.error('/employer/applications/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

