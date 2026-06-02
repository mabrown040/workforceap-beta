import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { notifyDiscord } from '@/lib/notify/discord';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
});

type Props = { params: Promise<{ id: string }> };async function _GET(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: applicationId } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id: applicationId,
      studentId: user.id,
    },
    include: {
      job: { 
        select: { title: true, employer: { select: { companyName: true } } }
      },
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
      employerName: application.job.employer.companyName,
      jobTitle: application.job.title,
    },
    messages: application.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      authorName: m.author?.fullName ?? 'Unknown',
      isFromEmployer: m.authorId !== user.id,
      readAt: m.readAt?.toISOString() ?? null,
    })),
  });

  } catch (error) {
    console.error('/member/applications/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: applicationId } = await params;

  const application = await prisma.jobPostingApplication.findFirst({
    where: {
      id: applicationId,
      studentId: user.id,
    },
    select: { id: true },
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
      data: { lastApplicantMessageAt: new Date() },
    });

    return msg;
  });

  void notifyDiscord({
    title: `Member → employer message`,
    body: parsed.data.body.trim().slice(0, 500),
    category: 'application_message',
    fields: [
      { name: 'applicationId', value: applicationId },
      { name: 'authorId', value: user.id },
    ],
  });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      authorName: message.author?.fullName ?? 'Unknown',
      isFromEmployer: false,
    },
  });

  } catch (error) {
    console.error('/member/applications/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

