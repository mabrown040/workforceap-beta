import { prisma } from '@/lib/db/prisma';
import type { JobApplicationStatus, JobApplicationSource } from '@prisma/client';

type JobForTracker = {
  id: string;
  title: string;
  employer: { companyName: string };
};

/**
 * Keeps the member Application Tracker in sync with curated job board activity.
 */
export async function syncCuratedJobToTracker(
  userId: string,
  job: JobForTracker,
  opts: {
    status: JobApplicationStatus;
    /** When true, sets appliedAt if moving to an applied state */
    markAppliedDate?: boolean;
    source?: JobApplicationSource;
  }
) {
  const existing = await prisma.jobApplication.findFirst({
    where: { userId, curatedJobId: job.id },
  });

  const notes = 'WorkforceAP Job Board';
  const url = `/dashboard/jobs/${job.id}`;
  const source = opts.source ?? 'DIRECT';

  if (existing) {
    return prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        status: opts.status,
        company: job.employer.companyName,
        role: job.title,
        url,
        appliedAt:
          opts.markAppliedDate && opts.status === 'APPLIED'
            ? new Date()
            : existing.appliedAt,
      },
    });
  }

  return prisma.jobApplication.create({
    data: {
      userId,
      company: job.employer.companyName,
      role: job.title,
      status: opts.status,
      source,
      curatedJobId: job.id,
      url,
      notes,
      appliedAt: opts.status === 'APPLIED' && opts.markAppliedDate ? new Date() : null,
    },
  });
}
