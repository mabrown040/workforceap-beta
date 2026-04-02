import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employerCtx = await getEmployerForUser(user.id);
  if (!employerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: applicationId } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id: applicationId,
      job: { employerId: employerCtx.employerId },
    },
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      job: { select: { title: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { fullName: true } },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  return NextResponse.json({
    application: {
      id: application.id,
      studentName: application.student.fullName,
      jobTitle: application.job.title,
    },
    messages: application.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      authorName: m.author.fullName,
      isFromEmployer: m.authorId === user.id,
      readAt: m.readAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employerCtx = await getEmployerForUser(user.id);
  if (!employerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: applicationId } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id: applicationId,
      job: { employerId: employerCtx.employerId },
    },
    select: { id: true, studentId: true },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.applicationMessage.create({
      data: {
        applicationId,
        authorId: user.id,
        body: parsed.data.body.trim(),
      },
      include: {
        author: { select: { fullName: true } },
      },
    });

    await tx.jobPostingApplication.update({
      where: { id: applicationId },
      data: { lastEmployerMessageAt: new Date() },
    });

    return msg;
  });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      authorName: message.author.fullName,
      isFromEmployer: true,
    },
  });
}

/** Mark applicant messages as read for the employer viewer. */
export async function PATCH(_request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employerCtx = await getEmployerForUser(user.id);
  if (!employerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: applicationId } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id: applicationId,
      job: { employerId: employerCtx.employerId },
    },
    select: { id: true, studentId: true },
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const now = new Date();
  await prisma.applicationMessage.updateMany({
    where: {
      applicationId,
      authorId: application.studentId,
      readAt: null,
    },
    data: { readAt: now },
  });

  return NextResponse.json({ ok: true, readAt: now.toISOString() });
}
