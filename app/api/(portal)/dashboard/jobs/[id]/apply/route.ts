import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendNewJobApplicationEmail } from '@/lib/email';
import { z } from 'zod';
import { trackEvent } from '@/lib/events/track';
import { syncCuratedJobToTracker } from '@/lib/jobs/syncCuratedJobToTracker';
import { checkJobApplicationRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  shareProfile: z.boolean(),
  shareResume: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limiting for job applications - use careers recommend limiter
  const { success: rateOk } = await checkJobApplicationRateLimit(authUser.id);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Too many applications. Please wait a moment before applying again.' },
      { status: 429 }
    );
  }

  const [dbUser, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { fullName: true, email: true },
    }),
    prisma.profile.findUnique({
      where: { userId: authUser.id },
      select: { resumeOriginalPath: true, resumeEnhancedPath: true },
    }),
  ]);
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, status: 'live' },
    include: { employer: { select: { contactEmail: true, companyName: true } } },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = applySchema.safeParse(body ?? {});
  
  if (!parsed.success || !parsed.data.shareProfile) {
    return NextResponse.json({ error: 'Profile sharing consent required' }, { status: 400 });
  }

  const existing = await prisma.jobPostingApplication.findUnique({
    where: { jobId_studentId: { jobId: id, studentId: authUser.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 400 });

  const resumePath = parsed.data.shareResume 
    ? (profile?.resumeEnhancedPath || profile?.resumeOriginalPath)
    : undefined;

  const app = await prisma.jobPostingApplication.create({
    data: {
      jobId: id,
      studentId: authUser.id,
      coverLetter: parsed.data.coverLetter,
      resumeUrl: parsed.data.resumeUrl,
      resumePath: resumePath,
      profileShared: true,
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

  await trackEvent({
    userId: authUser.id,
    eventName: 'application_added',
    entityType: 'job_application',
    entityId: app.id,
    metadata: { jobId: id, jobTitle: job.title },
    sourcePage: `/dashboard/jobs/${id}`,
  });

  try {
    await syncCuratedJobToTracker(
      authUser.id,
      { id: job.id, title: job.title, employer: { companyName: job.employer.companyName } },
      { status: 'APPLIED', markAppliedDate: true, source: 'DIRECT' }
    );
  } catch (e) {
    console.error('[apply] tracker sync:', e);
  }

  return NextResponse.json({ ok: true, applicationId: app.id });
}
