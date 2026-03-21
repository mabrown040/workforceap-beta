import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendNewJobApplicationEmail } from '@/lib/email';
import { z } from 'zod';

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { fullName: true, email: true },
  });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, status: 'live' },
    include: { employer: { select: { contactEmail: true } } },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = applySchema.safeParse(body ?? {});

  const existing = await prisma.jobPostingApplication.findUnique({
    where: { jobId_studentId: { jobId: id, studentId: authUser.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 400 });

  const app = await prisma.jobPostingApplication.create({
    data: {
      jobId: id,
      studentId: authUser.id,
      coverLetter: parsed.success ? parsed.data.coverLetter : undefined,
      resumeUrl: parsed.success ? parsed.data.resumeUrl : undefined,
    },
  });

  await prisma.job.update({
    where: { id },
    data: { applicationsCount: { increment: 1 } },
  });

  await sendNewJobApplicationEmail({
    to: job.employer.contactEmail,
    jobTitle: job.title,
    applicantName: dbUser.fullName ?? dbUser.email ?? 'Applicant',
    applicantEmail: dbUser.email,
    applicationId: app.id,
  });

  return NextResponse.json({ ok: true, applicationId: app.id });
}
