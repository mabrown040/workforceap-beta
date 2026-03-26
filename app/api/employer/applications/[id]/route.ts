import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { canTransitionJobApplicationStatus } from '@/lib/employer/applicationStatus';
import { recordEmployerWorkflowEvent } from '@/lib/portal/workflowEvents';
import type { JobPostingApplicationStatus } from '@prisma/client';

const patchSchema = z.object({
  status: z.enum(['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected']).optional(),
  employerNotes: z.string().max(20000).nullable().optional(),
  interviewScheduledAt: z.string().datetime().nullable().optional(),
  interviewNotes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employerCtx = await getEmployerForUser(user.id);
  if (!employerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.jobPostingApplication.findFirst({
    where: { id, job: { employerId: employerCtx.employerId } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { status: nextStatus, employerNotes, interviewScheduledAt, interviewNotes } = parsed.data;
  if (nextStatus !== undefined && nextStatus !== existing.status) {
    if (!canTransitionJobApplicationStatus(existing.status, nextStatus as JobPostingApplicationStatus)) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }
  }

  const updated = await prisma.jobPostingApplication.update({
    where: { id },
    data: {
      ...(nextStatus !== undefined ? { status: nextStatus as JobPostingApplicationStatus } : {}),
      ...(employerNotes !== undefined ? { employerNotes } : {}),
      ...(interviewScheduledAt !== undefined ? { interviewScheduledAt } : {}),
      ...(interviewNotes !== undefined ? { interviewNotes } : {}),
      ...(nextStatus !== undefined && nextStatus !== existing.status
        ? { statusUpdatedAt: new Date() }
        : {}),
    },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (nextStatus !== undefined && nextStatus !== existing.status) {
    await recordEmployerWorkflowEvent({
      employerId: employerCtx.employerId,
      actorUserId: user.id,
      kind: 'application_status',
      headline: `Candidate status → ${nextStatus} · ${updated.job.title}`,
      detail: updated.student.fullName,
      entityType: 'JobPostingApplication',
      entityId: id,
    });
  } else if (employerNotes !== undefined && employerNotes !== existing.employerNotes) {
    await recordEmployerWorkflowEvent({
      employerId: employerCtx.employerId,
      actorUserId: user.id,
      kind: 'application_note',
      headline: `Notes updated · ${updated.job.title}`,
      detail: updated.student.fullName,
      entityType: 'JobPostingApplication',
      entityId: id,
    });
  }

  return NextResponse.json(updated);
}
