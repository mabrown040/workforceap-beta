import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendNewJobApplicationEmail } from '@/lib/email';
import { z } from 'zod';
import { trackEvent } from '@/lib/events/track';
import { syncCuratedJobToTracker } from '@/lib/jobs/syncCuratedJobToTracker';
import { awardPoints } from '@/lib/member/points';
import { handleApiError, ApiError } from '@/lib/api/errors';

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
  try {
    const authUser = await getUser();
    if (!authUser) throw ApiError.unauthorized();

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
    if (!dbUser) throw ApiError.unauthorized('User not found');

    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: {
        id,
        status: 'live',
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        ],
      },
      include: { employer: { select: { contactEmail: true, companyName: true } } },
    });

    if (!job) throw ApiError.notFound('Job not found');

    const body = await request.json().catch(() => null);
    const parsed = applySchema.safeParse(body ?? {});

    if (!parsed.success || !parsed.data.shareProfile) {
      throw ApiError.badRequest('Profile sharing consent required');
    }

    const existing = await prisma.jobPostingApplication.findUnique({
      where: { jobId_studentId: { jobId: id, studentId: authUser.id } },
    });
    if (existing) throw ApiError.conflict('Already applied');

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

    // Award points (idempotent on application id)
    awardPoints(authUser.id, 'job_application', app.id).catch(() => {});

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
  } catch (error) {
    return handleApiError(error, 'POST /api/jobs/[id]/apply');
  }
}
