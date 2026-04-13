import { NextResponse } from 'next/server';

import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
import { getDbStatusForStage, getJobApplicationStage, type JobApplicationSource } from '@/lib/member/jobApplicationKanban';
import { updateJobApplicationSchema } from '@/lib/validation/jobApplication';

type Props = { params: Promise<{ id: string }> };

function serializeApplication(application: {
  id: string;
  role: string;
  company: string;
  appliedAt: Date | null;
  source: JobApplicationSource;
  status: ReturnType<typeof getDbStatusForStage>;
  nextInterviewDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: application.id,
    jobTitle: application.role,
    company: application.company,
    applicationDate: application.appliedAt?.toISOString() ?? null,
    source: application.source,
    status: getJobApplicationStage(application.status),
    nextInterviewDate: application.nextInterviewDate?.toISOString() ?? null,
    notes: application.notes,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateJobApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  try {
    await ensureUserInDb(user);

    const existing = await prisma.jobApplication.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const data: {
      role?: string;
      company?: string;
      appliedAt?: Date | null;
      source?: JobApplicationSource;
      status?: ReturnType<typeof getDbStatusForStage>;
      nextInterviewDate?: Date | null;
      notes?: string | null;
    } = {};

    if (parsed.data.jobTitle !== undefined) data.role = parsed.data.jobTitle;
    if (parsed.data.company !== undefined) data.company = parsed.data.company;
    if (parsed.data.applicationDate !== undefined) data.appliedAt = parsed.data.applicationDate ? new Date(parsed.data.applicationDate) : null;
    if (parsed.data.source !== undefined) data.source = parsed.data.source;
    if (parsed.data.status !== undefined) data.status = getDbStatusForStage(parsed.data.status);
    if (parsed.data.nextInterviewDate !== undefined) {
      data.nextInterviewDate = parsed.data.nextInterviewDate ? new Date(parsed.data.nextInterviewDate) : null;
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;

    const application = await prisma.jobApplication.update({
      where: { id },
      data,
    });

    if (data.status && data.status !== existing.status) {
      await trackEvent({
        userId: user.id,
        eventName: 'application_status_changed',
        entityType: 'job_application',
        entityId: application.id,
        sourcePage: '/dashboard/job-applications',
        metadata: {
          previousStatus: getJobApplicationStage(existing.status),
          nextStatus: getJobApplicationStage(data.status),
        },
      });
    } else {
      await trackEvent({
        userId: user.id,
        eventName: 'application_updated',
        entityType: 'job_application',
        entityId: application.id,
        sourcePage: '/dashboard/job-applications',
      });
    }

    return NextResponse.json(serializeApplication(application));
  } catch (error) {
    console.error('[PATCH /api/member/job-applications/:id]', error);
    const message = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
