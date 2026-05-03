import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { canTransitionJobApplicationStatus } from '@/lib/employer/applicationStatus';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected']),
  employerNotes: z.string().optional(),
  interviewScheduledAt: z.string().datetime().optional().nullable(),
});

/**
 * PATCH /api/employer/applications/[id]
 * Employer updates an applicant's status and notes.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const superAdmin = await isSuperAdmin(user.id);
  const ctx = await getEmployerForUser(user.id, { isSuperAdminHint: superAdmin });
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Verify this application belongs to this employer
  const application = await prisma.jobPostingApplication.findFirst({
    where: { id, job: { employerId: ctx.employerId } },
    select: { id: true, status: true },
  });
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
    const nextStatus = parsed.data.status;
    if (!canTransitionJobApplicationStatus(application.status, nextStatus)) {
      return NextResponse.json(
        { error: 'Invalid status transition', from: application.status, to: nextStatus },
        { status: 400 }
      );
    }
    updates.status = nextStatus;
    updates.statusUpdatedAt = new Date();
  }
  if (parsed.data.employerNotes !== undefined) {
    updates.employerNotes = parsed.data.employerNotes;
  }
  if (parsed.data.interviewScheduledAt !== undefined) {
    updates.interviewScheduledAt = parsed.data.interviewScheduledAt ? new Date(parsed.data.interviewScheduledAt) : null;
  }

  const updated = await prisma.jobPostingApplication.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ ok: true, application: updated });
}
